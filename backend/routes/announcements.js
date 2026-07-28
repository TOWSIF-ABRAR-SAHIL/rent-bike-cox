const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/announcementController');

router.get('/announcements/active', ctrl.getActive);
router.get('/admin/announcements', auth, authorize('Admin'), ctrl.getAll);
router.post('/admin/announcements', auth, authorize('Admin'), ctrl.create);
router.put('/admin/announcements/:id', auth, authorize('Admin'), ctrl.update);
router.delete('/admin/announcements/:id', auth, authorize('Admin'), ctrl.remove);
router.post('/announcements/:id/view', ctrl.trackView);
router.post('/announcements/:id/click', ctrl.trackClick);

module.exports = router;
