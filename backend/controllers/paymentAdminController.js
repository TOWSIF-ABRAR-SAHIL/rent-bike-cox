const PaymentIntent = require('../models/PaymentIntent');
const Refund = require('../models/Refund');
const RefundService = require('../services/RefundService');
const notificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

exports.getPaymentIntents = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const intents = await PaymentIntent.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email')
      .lean();
    const total = await PaymentIntent.countDocuments(query);
    res.json({ intents, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment intents' });
  }
};

exports.getRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('bookingId', 'invoiceNumber bike')
      .populate('userId', 'name email')
      .lean();
    const total = await Refund.countDocuments(query);
    res.json({ refunds, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds' });
  }
};

exports.approveRefund = async (req, res) => {
  try {
    const refund = await RefundService.approveRefund({
      refundId: req.params.id,
      approvedBy: req.user.id,
    });
    res.json({ message: 'Refund approved', refund });
  } catch (err) {
    logger.error('approveRefund error', { error: err.message });
    res.status(400).json({ message: err.message || 'Failed to approve refund' });
  }
};

exports.rejectRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const refund = await RefundService.rejectRefund({
      refundId: req.params.id,
      approvedBy: req.user.id,
      reason: reason || 'Rejected by admin',
    });
    res.json({ message: 'Refund rejected', refund });
  } catch (err) {
    logger.error('rejectRefund error', { error: err.message });
    res.status(400).json({ message: err.message || 'Failed to reject refund' });
  }
};

exports.processRefund = async (req, res) => {
  try {
    const refund = await RefundService.processRefund({
      refundId: req.params.id,
      processedBy: req.user.id,
    });

    try {
      const booking = await require('../models/Booking').findById(refund.bookingId).lean();
      const user = booking ? await require('../models/User').findById(booking.user).lean() : null;
      if (user && booking) {
        await notificationService.notifyRefundProcessed(
          { _id: booking._id, invoiceNumber: booking.invoiceNumber },
          { _id: user._id, name: user.name },
          { refundAmount: refund.amountPaisa / 100 }
        );
      }
    } catch { /* non-blocking */ }

    res.json({ message: 'Refund processed', refund });
  } catch (err) {
    logger.error('processRefund error', { error: err.message });
    res.status(400).json({ message: err.message || 'Failed to process refund' });
  }
};
