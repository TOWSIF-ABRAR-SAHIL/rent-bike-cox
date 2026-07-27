const PaymentIntent = require('../models/PaymentIntent');
const Refund = require('../models/Refund');

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
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email')
      .lean();
    const total = await Refund.countDocuments(query);
    res.json({ refunds, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds' });
  }
};
