const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const logger = require('../utils/logger');

exports.createDispute = async (req, res) => {
  try {
    const { bookingId, reason, description } = req.body;
    if (!bookingId || !reason || !description) {
      return res.status(400).json({ message: 'bookingId, reason, and description are required' });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to dispute this booking' });
    }
    if (booking.status !== 'Completed' && booking.status !== 'Confirmed' && booking.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Cannot dispute this booking in its current state' });
    }

    const existing = await Dispute.findOne({ booking: bookingId, user: req.user.id }).lean();
    if (existing) {
      return res.status(400).json({ message: 'You have already raised a dispute for this booking' });
    }

    const dispute = await Dispute.create({
      user: req.user.id,
      booking: bookingId,
      bike: booking.bike,
      reason,
      description,
    });

    res.status(201).json(dispute);
  } catch (error) {
    logger.error('createDispute error', { message: error.message });
    res.status(500).json({ message: 'Failed to create dispute' });
  }
};

exports.getMyDisputes = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { user: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const total = await Dispute.countDocuments(filter);
    const disputes = await Dispute.find(filter)
      .populate('bike', 'model brand images')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ disputes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getMyDisputes error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.reason) filter.reason = req.query.reason;

    const total = await Dispute.countDocuments(filter);
    const disputes = await Dispute.find(filter)
      .populate('user', 'name email phoneNumber')
      .populate('bike', 'model brand')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ disputes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getAllDisputes error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!['Resolved', 'Rejected', 'Under Review'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: Resolved, Rejected, or Under Review' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.status = status;
    if (resolution) dispute.resolution = resolution;
    dispute.resolvedBy = req.user.id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    res.json(dispute);
  } catch (error) {
    logger.error('resolveDispute error', { message: error.message });
    res.status(500).json({ message: 'Failed to resolve dispute' });
  }
};

exports.getDisputeStats = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const stats = await Dispute.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'Under Review'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
        },
      },
    ]);

    const byReason = await Dispute.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ stats: stats[0] || { total: 0, open: 0, underReview: 0, resolved: 0, rejected: 0 }, byReason });
  } catch (error) {
    logger.error('getDisputeStats error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch dispute stats' });
  }
};
