const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const FraudDetectionService = require('../services/FraudDetectionService');
const FraudEvent = require('../models/FraudEvent');

router.get('/events', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const events = await FraudEvent.find()
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .lean();
    const total = await FraudEvent.countDocuments();
    res.json({ events, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch fraud events' });
  }
});

router.get('/report', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await FraudDetectionService.getReport({ startDate, endDate });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate fraud report' });
  }
});

module.exports = router;
