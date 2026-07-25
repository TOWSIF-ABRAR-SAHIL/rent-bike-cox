const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const AuditLog = require('../models/AuditLog');

router.get('/', authMiddleware, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    const query = {};
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('actorId', 'name email');
    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
