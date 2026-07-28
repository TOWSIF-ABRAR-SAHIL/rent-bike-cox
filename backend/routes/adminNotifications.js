const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const AdminNotificationService = require('../services/AdminNotificationService');

router.get('/admin/notifications/unread', auth, authorize('Admin'), async (req, res) => {
  try {
    const count = await AdminNotificationService.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/notifications/recent', auth, authorize('Admin'), async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const notifications = await AdminNotificationService.getRecent(req.user._id, limit);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/notifications', auth, authorize('Admin'), async (req, res) => {
  try {
    const { type, severity, isRead, page, limit: lim } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    const result = await AdminNotificationService.getAll(filter, parseInt(page) || 1, parseInt(lim) || 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/notifications/:id/read', auth, authorize('Admin'), async (req, res) => {
  try {
    await AdminNotificationService.markRead(req.params.id, req.user._id);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/notifications/read-all', auth, authorize('Admin'), async (req, res) => {
  try {
    await AdminNotificationService.markAllRead(req.user._id);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
