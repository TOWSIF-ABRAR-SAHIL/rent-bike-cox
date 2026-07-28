const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const MaintenanceLog = require('../models/MaintenanceLog');
const logger = require('../utils/logger');

exports.getVehicleHistory = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { ownerId, role } = req.user;
    const { from, to, type, page = 1, limit = 20 } = req.query;

    const bikeQuery = { _id: bikeId };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const bike = await Bike.findOne(bikeQuery)
      .populate('category', 'name')
      .populate('zone', 'name color')
      .populate('renter', 'name email');

    if (!bike) return res.status(404).json({ message: 'Vehicle not found' });

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    const events = [];

    if (!type || type === 'booking') {
      const bookingQuery = { bike: bikeId };
      if (Object.keys(dateFilter).length > 0) {
        bookingQuery.createdAt = dateFilter;
      }

      const bookings = await Booking.find(bookingQuery)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      for (const b of bookings) {
        events.push({
          type: 'booking',
          date: b.createdAt,
          data: {
            _id: b._id,
            status: b.status,
            user: b.user?.name || 'Walk-in',
            startTime: b.startTime,
            endTime: b.endTime,
            totalPrice: b.totalPrice,
            advancePaid: b.advancePaid,
            paymentStatus: b.paymentStatus,
            invoiceNumber: b.invoiceNumber,
            cancellationReason: b.cancellationReason,
            refundAmount: b.refundAmount,
          },
        });
      }
    }

    if (!type || type === 'maintenance') {
      const maintenanceQuery = { bike: bikeId };
      if (Object.keys(dateFilter).length > 0) {
        maintenanceQuery.performedAt = dateFilter;
      }

      const maintenanceLogs = await MaintenanceLog.find(maintenanceQuery)
        .populate('performedBy', 'name')
        .sort({ performedAt: -1 })
        .lean();

      for (const m of maintenanceLogs) {
        events.push({
          type: 'maintenance',
          date: m.performedAt,
          data: {
            _id: m._id,
            maintenanceType: m.type,
            title: m.title,
            description: m.description,
            cost: m.cost,
            mileage: m.mileage,
            status: m.status,
            performedBy: m.performedBy?.name || 'System',
            nextServiceDue: m.nextServiceDue,
          },
        });
      }
    }

    if (!type || type === 'status') {
      const bookings = await Booking.find({ bike: bikeId }).sort({ createdAt: 1 }).lean();
      let lastStatus = null;

      for (const b of bookings) {
        if (b.status !== lastStatus) {
          events.push({
            type: 'status',
            date: b.createdAt,
            data: {
              status: b.status,
              previousStatus: lastStatus,
              bookingId: b._id,
            },
          });
          lastStatus = b.status;
        }
      }
    }

    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = events.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedEvents = events.slice(start, start + limitNum);

    res.json({
      bike: bike.toObject(),
      events: paginatedEvents,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('getVehicleHistory error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch vehicle history' });
  }
};

exports.getVehicleStats = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { ownerId, role } = req.user;
    const { days = 90 } = req.query;

    const bikeQuery = { _id: bikeId };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const bike = await Bike.findOne(bikeQuery).lean();
    if (!bike) return res.status(404).json({ message: 'Vehicle not found' });

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const bookingStats = await Booking.aggregate([
      { $match: { bike: bike._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          avgRevenue: { $avg: '$totalPrice' },
        },
      },
    ]);

    const maintenanceStats = await MaintenanceLog.aggregate([
      { $match: { bike: bike._id, performedAt: { $gte: since } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
        },
      },
    ]);

    const totalBookings = bookingStats.reduce((sum, s) => sum + s.count, 0);
    const completedBookings = bookingStats.find(s => s._id === 'Completed')?.count || 0;
    const cancelledBookings = bookingStats.find(s => s._id === 'Cancelled')?.count || 0;
    const totalRevenue = bookingStats.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    const totalMaintenanceCost = maintenanceStats.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalMaintenanceEvents = maintenanceStats.reduce((sum, s) => sum + s.count, 0);

    const uptimeDays = parseInt(days) - totalMaintenanceEvents * 2;
    const uptimePercent = parseInt(days) > 0 ? ((uptimeDays / parseInt(days)) * 100).toFixed(1) : 0;

    res.json({
      totalBookings,
      completedBookings,
      cancelledBookings,
      completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0,
      totalRevenue,
      avgRevenuePerBooking: completedBookings > 0 ? (totalRevenue / completedBookings).toFixed(0) : 0,
      totalMaintenanceEvents,
      totalMaintenanceCost,
      uptimePercent: parseFloat(uptimePercent),
      days: parseInt(days),
      bookingStats: bookingStats.map(s => ({ status: s._id, count: s.count, revenue: s.totalRevenue })),
      maintenanceStats: maintenanceStats.map(s => ({ type: s._id, count: s.count, cost: s.totalCost })),
    });
  } catch (error) {
    logger.error('getVehicleStats error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch vehicle stats' });
  }
};

exports.exportVehicleHistory = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { ownerId, role } = req.user;

    const bikeQuery = { _id: bikeId };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const bike = await Bike.findOne(bikeQuery)
      .populate('category', 'name')
      .populate('zone', 'name')
      .lean();

    if (!bike) return res.status(404).json({ message: 'Vehicle not found' });

    const bookings = await Booking.find({ bike: bikeId }).populate('user', 'name').sort({ createdAt: -1 }).lean();
    const maintenanceLogs = await MaintenanceLog.find({ bike: bikeId }).populate('performedBy', 'name').sort({ performedAt: -1 }).lean();

    const rows = [['Date', 'Type', 'Details', 'Status', 'Amount', 'Person']];

    for (const b of bookings) {
      rows.push([
        new Date(b.createdAt).toLocaleDateString(),
        'Booking',
        `${b.user?.name || 'Walk-in'} (${b.startTime ? new Date(b.startTime).toLocaleDateString() : 'N/A'} - ${b.endTime ? new Date(b.endTime).toLocaleDateString() : 'N/A'})`,
        b.status,
        b.totalPrice || 0,
        b.user?.name || 'Walk-in',
      ]);
    }

    for (const m of maintenanceLogs) {
      rows.push([
        new Date(m.performedAt).toLocaleDateString(),
        'Maintenance',
        `${m.type}: ${m.title}`,
        m.status,
        m.cost || 0,
        m.performedBy?.name || 'System',
      ]);
    }

    rows.sort((a, b) => new Date(b[0]) - new Date(a[0]));

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=vehicle-history-${bike.model}-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('exportVehicleHistory error', { message: error.message });
    res.status(500).json({ message: 'Failed to export vehicle history' });
  }
};
