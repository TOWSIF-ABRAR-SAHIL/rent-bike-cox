const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const AuditLog = require('../models/AuditLog');

router.get('/', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const query = {};
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('actorId', 'name email')
      .lean();
    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
