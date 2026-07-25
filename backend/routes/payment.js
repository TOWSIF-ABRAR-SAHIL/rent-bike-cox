const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const PaymentIntent = require('../models/PaymentIntent');
const Refund = require('../models/Refund');

router.get('/intents', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const intents = await PaymentIntent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email');
    const total = await PaymentIntent.countDocuments(query);
    res.json({ intents, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment intents' });
  }
});

router.get('/refunds', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email');
    const total = await Refund.countDocuments(query);
    res.json({ refunds, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds' });
  }
});

module.exports = router;
