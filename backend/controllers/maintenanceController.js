const MaintenanceLog = require('../models/MaintenanceLog');
const Bike = require('../models/Bike');
const MaintenanceNotification = require('../models/MaintenanceNotification');
const logger = require('../utils/logger');

exports.createMaintenanceLog = async (req, res) => {
  try {
    const { bikeId, type, title, description, cost, mileage, performedAt, nextServiceDue, nextServiceMileage, status, notes } = req.body;

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to add maintenance for this bike' });
    }

    const log = await MaintenanceLog.create({
      bike: bikeId,
      type,
      title,
      description,
      cost: cost || 0,
      mileage,
      performedBy: req.user.id,
      performedAt: performedAt || new Date(),
      nextServiceDue,
      nextServiceMileage,
      status: status || 'completed',
      notes,
    });

    if (nextServiceDue) {
      await MaintenanceNotification.create({
        bike: bikeId,
        renter: bike.renter,
        type: 'service_due',
        message: `Scheduled service due for ${bike.brand} ${bike.model}: ${title}`,
        dueDate: nextServiceDue,
      });
    }

    if (mileage) {
      bike.currentMileage = mileage;
    }
    bike.lastServiceDate = performedAt || new Date();
    if (nextServiceDue) {
      bike.nextServiceDue = nextServiceDue;
    }
    await bike.save();

    logger.info('Maintenance log created', { bikeId, type, cost: cost || 0 });
    res.status(201).json(log);
  } catch (error) {
    logger.error('createMaintenanceLog error', { message: error.message });
    res.status(500).json({ message: 'Failed to create maintenance log' });
  }
};

exports.getMaintenanceLogs = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const type = req.query.type;
    const status = req.query.status;

    const filter = { bike: bikeId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const total = await MaintenanceLog.countDocuments(filter);
    const logs = await MaintenanceLog.find(filter)
      .populate('performedBy', 'name email')
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ logs, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getMaintenanceLogs error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch maintenance logs' });
  }
};

exports.updateMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Maintenance log not found' });

    const bike = await Bike.findById(log.bike).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update this maintenance log' });
    }

    const allowedUpdates = ['type', 'title', 'description', 'cost', 'mileage', 'nextServiceDue', 'nextServiceMileage', 'status', 'notes'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) log[field] = req.body[field];
    });

    await log.save();
    logger.info('Maintenance log updated', { logId: log._id });
    res.json(log);
  } catch (error) {
    logger.error('updateMaintenanceLog error', { message: error.message });
    res.status(500).json({ message: 'Failed to update maintenance log' });
  }
};

exports.deleteMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ message: 'Maintenance log not found' });

    const bike = await Bike.findById(log.bike).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this maintenance log' });
    }

    await MaintenanceLog.findByIdAndDelete(req.params.id);
    logger.info('Maintenance log deleted', { logId: req.params.id });
    res.json({ message: 'Maintenance log deleted' });
  } catch (error) {
    logger.error('deleteMaintenanceLog error', { message: error.message });
    res.status(500).json({ message: 'Failed to delete maintenance log' });
  }
};

exports.getMaintenanceStats = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const [totalLogs, totalCost, typeBreakdown, recentLogs] = await Promise.all([
      MaintenanceLog.countDocuments({ bike: bikeId }),
      MaintenanceLog.aggregate([
        { $match: { bike: bike._id } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
      MaintenanceLog.aggregate([
        { $match: { bike: bike._id } },
        { $group: { _id: '$type', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
        { $sort: { count: -1 } },
      ]),
      MaintenanceLog.find({ bike: bikeId })
        .sort({ performedAt: -1 })
        .limit(5)
        .populate('performedBy', 'name')
        .lean(),
    ]);

    res.json({
      totalLogs,
      totalCost: totalCost[0]?.total || 0,
      typeBreakdown,
      recentLogs,
      currentMileage: bike.currentMileage || 0,
      lastServiceDate: bike.lastServiceDate,
      nextServiceDue: bike.nextServiceDue,
    });
  } catch (error) {
    logger.error('getMaintenanceStats error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch maintenance stats' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await MaintenanceNotification.find({
      renter: req.user.id,
      acknowledged: false,
    })
      .populate('bike', 'model brand')
      .sort({ dueDate: 1 })
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (error) {
    logger.error('getNotifications error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

exports.acknowledgeNotification = async (req, res) => {
  try {
    const notification = await MaintenanceNotification.findOneAndUpdate(
      { _id: req.params.id, renter: req.user.id },
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    logger.error('acknowledgeNotification error', { message: error.message });
    res.status(500).json({ message: 'Failed to acknowledge notification' });
  }
};
