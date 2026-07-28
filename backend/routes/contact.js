const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/contactController');

router.post('/contact', ctrl.submitMessage);
router.get('/admin/messages', auth, authorize('Admin'), ctrl.getAll);
router.get('/admin/messages/unread', auth, authorize('Admin'), ctrl.getUnreadCount);
router.get('/admin/messages/:id', auth, authorize('Admin'), ctrl.getById);
router.put('/admin/messages/:id/read', auth, authorize('Admin'), ctrl.markRead);
router.post('/admin/messages/:id/reply', auth, authorize('Admin'), ctrl.reply);
router.put('/admin/messages/:id/status', auth, authorize('Admin'), ctrl.updateStatus);

module.exports = router;
