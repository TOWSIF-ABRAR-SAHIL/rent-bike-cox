const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const AuditLog = require('../models/AuditLog');

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
    const { page = 1, limit = 50, action } = req.query;
    const query = {};
    if (action) query.action = action;
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
