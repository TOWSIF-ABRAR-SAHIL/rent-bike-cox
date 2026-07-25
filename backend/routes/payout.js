const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Payout = require('../models/Payout');
const PayoutService = require('../services/PayoutService');

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('renterId', 'name email');
    const total = await Payout.countDocuments(query);
    res.json({ payouts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payouts' });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const payouts = await PayoutService.getPendingPayouts();
    res.json({ payouts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending payouts' });
  }
});

router.post('/approve/:payoutId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const payout = await PayoutService.approvePayout({
      payoutId: req.params.payoutId,
      processedBy: req.user.id,
    });
    res.json(payout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/pay/:payoutId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
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
