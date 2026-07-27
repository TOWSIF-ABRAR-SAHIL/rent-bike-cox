const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const Payout = require('../models/Payout');
const PayoutService = require('../services/PayoutService');

router.get('/', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const query = {};
    if (status) query.status = status;
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
});

router.get('/pending', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const payouts = await PayoutService.getPendingPayouts();
    res.json({ payouts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending payouts' });
  }
});

router.post('/approve/:payoutId', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const payout = await PayoutService.approvePayout({
      payoutId: req.params.payoutId,
      processedBy: req.user.id,
    });
    res.json(payout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/pay/:payoutId', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const payout = await PayoutService.markPayoutPaid({
      payoutId: req.params.payoutId,
      paymentReference: req.body.paymentReference,
    });
    res.json(payout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
