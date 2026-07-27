const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const User = require('../models/User');
const Category = require('../models/Category');
const logger = require('../utils/logger');

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { days = 30, ownerId, role } = req.user;
    const numDays = parseInt(days) || 30;
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const matchQuery = {
      createdAt: { $gte: since },
      status: { $in: ['Confirmed', 'Active', 'Completed'] },
    };

    const revenueByDay = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);
    const totalBookings = revenueByDay.reduce((sum, d) => sum + d.count, 0);
    const avgRevenuePerDay = numDays > 0 ? (totalRevenue / numDays).toFixed(0) : 0;

    const monthlyComparison = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            $lt: since,
          },
          status: { $in: ['Confirmed', 'Active', 'Completed'] },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    const prevRevenue = monthlyComparison[0]?.revenue || 0;
    const revenueGrowth = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;

    res.json({
      revenueByDay: revenueByDay.map(d => ({ date: d._id, revenue: d.revenue, count: d.count })),
      totalRevenue,
      totalBookings,
      avgRevenuePerDay: parseInt(avgRevenuePerDay),
      revenueGrowth: parseFloat(revenueGrowth),
      days: numDays,
    });
  } catch (error) {
    logger.error('getRevenueAnalytics error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch revenue analytics' });
  }
};

exports.getBookingTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days) || 30;
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const statusBreakdown = await Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const bookingsByDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyDistribution = await Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      statusBreakdown: statusBreakdown.map(s => ({ status: s._id, count: s.count })),
      bookingsByDay: bookingsByDay.map(d => ({ date: d._id, total: d.total, completed: d.completed, cancelled: d.cancelled })),
      hourlyDistribution: hourlyDistribution.map(h => ({ hour: h._id, count: h.count })),
    });
  } catch (error) {
    logger.error('getBookingTrends error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch booking trends' });
  }
};

exports.getCategoryPerformance = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days) || 30;
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const categories = await Category.find({ isActive: true }).lean();
    const catMap = {};
    categories.forEach(c => { catMap[c._id.toString()] = c.name; });

    const bikeIds = (await Bike.find({ category: { $in: categories.map(c => c._id) } }).select('_id category').lean()).map(b => ({ id: b._id, cat: b.category.toString() }));

    const catBikeMap = {};
    for (const b of bikeIds) {
      if (!catBikeMap[b.cat]) catBikeMap[b.cat] = [];
      catBikeMap[b.cat].push(b.id);
    }

    const performance = [];
    for (const [catId, catName] of Object.entries(catMap)) {
      const catBikeIds = catBikeMap[catId] || [];
      if (catBikeIds.length === 0) {
        performance.push({ category: catName, bikes: 0, bookings: 0, revenue: 0 });
        continue;
      }

      const stats = await Booking.aggregate([
        {
          $match: {
            bike: { $in: catBikeIds },
            createdAt: { $gte: since },
            status: { $in: ['Confirmed', 'Active', 'Completed'] },
          },
        },
        { $group: { _id: null, bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      ]);

      performance.push({
        category: catName,
        bikes: catBikeIds.length,
        bookings: stats[0]?.bookings || 0,
        revenue: stats[0]?.revenue || 0,
      });
    }

    res.json(performance.sort((a, b) => b.revenue - a.revenue));
  } catch (error) {
    logger.error('getCategoryPerformance error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch category performance' });
  }
};

exports.getTopBikes = async (req, res) => {
  try {
    const { days = 30, limit = 5 } = req.query;
    const numDays = parseInt(days) || 30;
    const numLimit = Math.min(20, Math.max(1, parseInt(limit) || 5));
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const topBikes = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: ['Confirmed', 'Active', 'Completed'] },
        },
      },
      {
        $group: {
          _id: '$bike',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgRevenue: { $avg: '$totalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: numLimit },
    ]);

    const bikeIds = topBikes.map(b => b._id);
    const bikes = await Bike.find({ _id: { $in: bikeIds } })
      .select('model brand pricePerHour images condition')
      .populate('category', 'name');

    const bikeMap = {};
    bikes.forEach(b => { bikeMap[b._id.toString()] = b; });

    const result = topBikes.map(t => ({
      bike: bikeMap[t._id.toString()]?.toObject() || { model: 'Unknown', brand: 'Unknown' },
      bookings: t.bookings,
      revenue: t.revenue,
      avgRevenue: Math.round(t.avgRevenue),
    }));

    res.json(result);
  } catch (error) {
    logger.error('getTopBikes error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch top bikes' });
  }
};

exports.getCustomerInsights = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days) || 30;
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const totalCustomers = await User.countDocuments({ role: 'User' });
    const newCustomers = await User.countDocuments({ role: 'User', createdAt: { $gte: since } });

    const repeatCustomers = await Booking.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ['Confirmed', 'Active', 'Completed'] } } },
      { $group: { _id: '$user', bookingCount: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
      { $group: { _id: null, total: { $sum: 1 }, repeat: { $sum: { $cond: [{ $gt: ['$bookingCount', 1] }, 1, 0] } }, avgSpend: { $avg: '$totalSpent' } } },
    ]);

    const topSpenders = await Booking.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ['Confirmed', 'Active', 'Completed'] } } },
      { $group: { _id: '$user', totalSpent: { $sum: '$totalAmount' }, bookingCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
    ]);

    const userIds = topSpenders.map(s => s._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    res.json({
      totalCustomers,
      newCustomers,
      activeCustomers: repeatCustomers[0]?.total || 0,
      repeatCustomers: repeatCustomers[0]?.repeat || 0,
      repeatRate: repeatCustomers[0]?.total > 0 ? ((repeatCustomers[0]?.repeat / repeatCustomers[0]?.total) * 100).toFixed(1) : 0,
      avgSpendPerCustomer: Math.round(repeatCustomers[0]?.avgSpend || 0),
      topSpenders: topSpenders.map(s => ({
        name: userMap[s._id?.toString()] || 'Unknown',
        totalSpent: s.totalSpent,
        bookings: s.bookingCount,
      })),
    });
  } catch (error) {
    logger.error('getCustomerInsights error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch customer insights' });
  }
};

exports.exportAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days) || 30;
    const since = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      createdAt: { $gte: since },
      status: { $in: ['Confirmed', 'Active', 'Completed'] },
    }).populate('bike', 'model brand').sort({ createdAt: -1 }).lean();

    const rows = [['Date', 'Invoice', 'Vehicle', 'Amount', 'Advance', 'Status', 'Payment']];

    for (const b of bookings) {
      rows.push([
        new Date(b.createdAt).toLocaleDateString(),
        b.invoiceNumber || 'N/A',
        `${b.bike?.brand || ''} ${b.bike?.model || ''}`.trim() || 'N/A',
        b.totalAmount || 0,
        b.advancePaid || 0,
        b.status,
        b.paymentStatus,
      ]);
    }

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${numDays}d-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('exportAnalytics error', { message: error.message });
    res.status(500).json({ message: 'Failed to export analytics' });
  }
};
