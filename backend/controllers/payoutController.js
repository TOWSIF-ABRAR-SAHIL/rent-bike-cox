const PayoutService = require('../services/PayoutService');

exports.getPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const query = {};
    if (status) query.status = status;
    const Payout = require('../models/Payout');
    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('renterId', 'name email')
      .lean();
    const total = await Payout.countDocuments(query);
    res.json({ payouts, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payouts' });
  }
};

exports.getPendingPayouts = async (req, res) => {
  try {
    const payouts = await PayoutService.getPendingPayouts();
    res.json({ payouts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending payouts' });
  }
};

exports.approvePayout = async (req, res) => {
  try {
    const payout = await PayoutService.approvePayout({
      payoutId: req.params.payoutId,
      processedBy: req.user.id,
    });
    res.json(payout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.markPayoutPaid = async (req, res) => {
  try {
    const payout = await PayoutService.markPayoutPaid({
      payoutId: req.params.payoutId,
      paymentReference: req.body.paymentReference,
    });
    res.json(payout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
