const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const MaintenanceLog = require('../models/MaintenanceLog');
const Category = require('../models/Category');
const Zone = require('../models/Zone');
const logger = require('../utils/logger');

exports.getFleetSummary = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const bikeQuery = role === 'Admin' ? {} : { renter: ownerId };

    const totalBikes = await Bike.countDocuments(bikeQuery);
    const activeBikes = await Bike.countDocuments({ ...bikeQuery, availability: true, isUnderMaintenance: false });
    const maintenanceBikes = await Bike.countDocuments({ ...bikeQuery, isUnderMaintenance: true });
    const unavailableBikes = await Bike.countDocuments({ ...bikeQuery, availability: false, isUnderMaintenance: false });

    const conditions = await Bike.aggregate([
      { $match: bikeQuery },
      { $group: { _id: '$condition', count: { $sum: 1 } } },
    ]);

    const conditionMap = { excellent: 0, good: 0, fair: 0, poor: 0 };
    conditions.forEach(c => { if (conditionMap[c._id] !== undefined) conditionMap[c._id] = c.count; });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const bookingsThisMonth = await Booking.countDocuments({
      ...bikeQuery,
      bike: role === 'Admin' ? { $exists: true } : undefined,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const revenueThisMonth = await Booking.aggregate([
      {
        $match: {
          ...(role === 'Admin' ? {} : { bike: { $exists: true } }),
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: { $in: ['Confirmed', 'Active', 'Completed'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    const bikeIds = await Bike.find(bikeQuery).select('_id').lean();
    const bikeIdList = bikeIds.map(b => b._id);

    const activeBookings = await Booking.countDocuments({
      status: { $in: ['Pending', 'Confirmed', 'Active'] },
      ...(role === 'Admin' ? {} : { bike: { $in: bikeIdList } }),
    });

    res.json({
      totalBikes,
      activeBikes,
      maintenanceBikes,
      unavailableBikes,
      conditionMap,
      bookingsThisMonth,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      activeBookings,
    });
  } catch (error) {
    logger.error('getFleetSummary error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch fleet summary' });
  }
};

exports.getFleetUtilization = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const bikeQuery = role === 'Admin' ? {} : { renter: ownerId };

    const bikes = await Bike.find(bikeQuery).select('model brand category').lean();
    const bikeIds = bikes.map(b => b._id);

    const now = new Date();
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      bike: { $in: bikeIds },
      startTime: { $gte: startDate, $lte: now },
      status: { $in: ['Confirmed', 'Active', 'Completed'] },
    }).select('bike startTime endTime').lean();

    const utilizationMap = {};
    for (const bike of bikes) {
      utilizationMap[bike._id.toString()] = {
        bikeId: bike._id,
        model: bike.model,
        brand: bike.brand,
        totalHours: 0,
        bookingCount: 0,
      };
    }

    for (const booking of bookings) {
      const bikeId = booking.bike.toString();
      if (!utilizationMap[bikeId]) continue;
      const duration = Math.max(0, (new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
      utilizationMap[bikeId].totalHours += duration;
      utilizationMap[bikeId].bookingCount++;
    }

    const totalPossibleHours = bikes.length * days * 24;
    const totalBookedHours = Object.values(utilizationMap).reduce((sum, b) => sum + b.totalHours, 0);
    const fleetUtilization = totalPossibleHours > 0 ? ((totalBookedHours / totalPossibleHours) * 100).toFixed(1) : 0;

    const bikesUtilization = Object.values(utilizationMap)
      .map(b => ({
        ...b,
        utilization: days * 24 > 0 ? ((b.totalHours / (days * 24)) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => parseFloat(b.utilization) - parseFloat(a.utilization));

    res.json({ fleetUtilization: parseFloat(fleetUtilization), bikes: bikesUtilization, days });
  } catch (error) {
    logger.error('getFleetUtilization error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch fleet utilization' });
  }
};

exports.getFleetBikes = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const bikeQuery = role === 'Admin' ? {} : { renter: ownerId };

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const condition = req.query.condition || 'all';
    const zone = req.query.zone || 'all';
    const sort = req.query.sort || '-createdAt';

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      bikeQuery.$or = [
        { model: { $regex: escapedSearch, $options: 'i' } },
        { brand: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (status === 'active') {
      bikeQuery.availability = true;
      bikeQuery.isUnderMaintenance = false;
    } else if (status === 'maintenance') {
      bikeQuery.isUnderMaintenance = true;
    } else if (status === 'unavailable') {
      bikeQuery.availability = false;
      bikeQuery.isUnderMaintenance = false;
    }

    if (condition !== 'all') {
      bikeQuery.condition = condition;
    }

    if (zone !== 'all') {
      bikeQuery.zone = zone;
    }

    const total = await Bike.countDocuments(bikeQuery);

    const bikes = await Bike.find(bikeQuery)
      .populate('category', 'name')
      .populate('zone', 'name color')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const now = new Date();
    const bikeIds = bikes.map(b => b._id);

    const activeBookings = await Booking.aggregate([
      {
        $match: {
          bike: { $in: bikeIds },
          status: { $in: ['Pending', 'Confirmed', 'Active'] },
          startTime: { $lte: now },
          endTime: { $gte: now },
        },
      },
      { $group: { _id: '$bike', count: { $sum: 1 }, nextEnd: { $max: '$endTime' } } },
    ]);

    const nextMaintenance = await MaintenanceLog.aggregate([
      {
        $match: {
          bike: { $in: bikeIds },
          status: { $in: ['in_progress', 'scheduled'] },
          nextServiceDue: { $gte: now },
        },
      },
      { $group: { _id: '$bike', nextDue: { $min: '$nextServiceDue' } } },
    ]);

    const bookingMap = {};
    activeBookings.forEach(b => {
      bookingMap[b._id.toString()] = { activeCount: b.count, nextEnd: b.nextEnd };
    });

    const maintenanceMap = {};
    nextMaintenance.forEach(m => {
      maintenanceMap[m._id.toString()] = m.nextDue;
    });

    const enrichedBikes = bikes.map(b => {
      const bObj = b.toObject();
      bObj.activeBooking = bookingMap[b._id.toString()] || null;
      bObj.nextMaintenanceDue = maintenanceMap[b._id.toString()] || null;
      return bObj;
    });

    res.json({
      bikes: enrichedBikes,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getFleetBikes error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch fleet bikes' });
  }
};

exports.exportFleet = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const bikeQuery = role === 'Admin' ? {} : { renter: ownerId };

    const bikes = await Bike.find(bikeQuery)
      .populate('category', 'name')
      .populate('zone', 'name')
      .sort('-createdAt')
      .lean();

    const rows = [['Model', 'Brand', 'Category', 'Zone', 'Price/Hr', 'Condition', 'Status', 'Mileage', 'Next Service', 'Owner']];

    for (const bike of bikes) {
      rows.push([
        bike.model,
        bike.brand,
        bike.category?.name || 'N/A',
        bike.zone?.name || 'N/A',
        bike.pricePerHour,
        bike.condition,
        bike.isUnderMaintenance ? 'Maintenance' : bike.availability ? 'Active' : 'Unavailable',
        bike.currentMileage || 0,
        bike.nextServiceDue ? new Date(bike.nextServiceDue).toLocaleDateString() : 'N/A',
        bike.renter?.name || 'N/A',
      ]);
    }

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fleet-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('exportFleet error', { message: error.message });
    res.status(500).json({ message: 'Failed to export fleet data' });
  }
};
