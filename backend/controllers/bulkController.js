const Bike = require('../models/Bike');
const MaintenanceLog = require('../models/MaintenanceLog');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const { bikeIds, availability, isUnderMaintenance } = req.body;

    if (!Array.isArray(bikeIds) || bikeIds.length === 0) {
      return res.status(400).json({ message: 'bikeIds array is required' });
    }

    if (availability === undefined && isUnderMaintenance === undefined) {
      return res.status(400).json({ message: 'At least one of availability or isUnderMaintenance is required' });
    }

    const bikeQuery = { _id: { $in: bikeIds } };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const update = {};
    if (availability !== undefined) update.availability = availability;
    if (isUnderMaintenance !== undefined) update.isUnderMaintenance = isUnderMaintenance;

    const result = await Bike.updateMany(bikeQuery, { $set: update });

    logger.info('Bulk status update', { userId: req.user.id, bikeIds, update, modified: result.modifiedCount });

    res.json({ message: `${result.modifiedCount} vehicles updated`, modified: result.modifiedCount });
  } catch (error) {
    logger.error('bulkUpdateStatus error', { message: error.message });
    res.status(500).json({ message: 'Failed to update vehicle status' });
  }
};

exports.bulkScheduleMaintenance = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const { bikeIds, type, title, nextServiceDue } = req.body;

    if (!Array.isArray(bikeIds) || bikeIds.length === 0) {
      return res.status(400).json({ message: 'bikeIds array is required' });
    }

    if (!type || !title || !nextServiceDue) {
      return res.status(400).json({ message: 'type, title, and nextServiceDue are required' });
    }

    const bikeQuery = { _id: { $in: bikeIds } };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const bikes = await Bike.find(bikeQuery).select('_id');
    const validIds = bikes.map(b => b._id.toString());

    const logs = validIds.map(bikeId => ({
      bike: bikeId,
      type,
      title,
      nextServiceDue: new Date(nextServiceDue),
      status: 'scheduled',
      performedBy: req.user.id,
      performedAt: new Date(),
    }));

    if (logs.length > 0) {
      await MaintenanceLog.insertMany(logs);
      await Bike.updateMany({ _id: { $in: validIds } }, { $set: { isUnderMaintenance: true } });
    }

    logger.info('Bulk maintenance scheduled', { userId: req.user.id, bikeIds: validIds, count: logs.length });

    res.json({ message: `Maintenance scheduled for ${logs.length} vehicles`, scheduled: logs.length });
  } catch (error) {
    logger.error('bulkScheduleMaintenance error', { message: error.message });
    res.status(500).json({ message: 'Failed to schedule maintenance' });
  }
};

exports.bulkExportSelected = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const { bikeIds } = req.body;

    if (!Array.isArray(bikeIds) || bikeIds.length === 0) {
      return res.status(400).json({ message: 'bikeIds array is required' });
    }

    const bikeQuery = { _id: { $in: bikeIds } };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const bikes = await Bike.find(bikeQuery)
      .populate('category', 'name')
      .sort('-createdAt');

    const rows = [['Model', 'Brand', 'Category', 'Price/Hr', 'Condition', 'Status', 'Mileage', 'Next Service']];

    for (const bike of bikes) {
      rows.push([
        bike.model,
        bike.brand,
        bike.category?.name || 'N/A',
        bike.pricePerHour,
        bike.condition,
        bike.isUnderMaintenance ? 'Maintenance' : bike.availability ? 'Active' : 'Unavailable',
        bike.currentMileage || 0,
        bike.nextServiceDue ? new Date(bike.nextServiceDue).toLocaleDateString() : 'N/A',
      ]);
    }

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fleet-selected-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('bulkExportSelected error', { message: error.message });
    res.status(500).json({ message: 'Failed to export selected vehicles' });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ownerId, role } = req.user;
    const { bikeIds } = req.body;

    if (!Array.isArray(bikeIds) || bikeIds.length === 0) {
      return res.status(400).json({ message: 'bikeIds array is required' });
    }

    const bikeQuery = { _id: { $in: bikeIds } };
    if (role !== 'Admin') bikeQuery.renter = ownerId;

    const activeBookings = await Booking.countDocuments({
      bike: { $in: bikeIds },
      status: { $in: ['Pending', 'Confirmed', 'Active'] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({ message: `Cannot delete: ${activeBookings} vehicles have active bookings` });
    }

    const result = await Bike.updateMany(bikeQuery, { $set: { availability: false } });

    logger.info('Bulk delete (deactivate)', { userId: req.user.id, bikeIds, modified: result.modifiedCount });

    res.json({ message: `${result.modifiedCount} vehicles deactivated`, modified: result.modifiedCount });
  } catch (error) {
    logger.error('bulkDelete error', { message: error.message });
    res.status(500).json({ message: 'Failed to deactivate vehicles' });
  }
};
