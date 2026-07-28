const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/campaignController');

router.get('/admin/campaigns', auth, authorize('Admin'), ctrl.getAll);
router.get('/admin/campaigns/:id', auth, authorize('Admin'), ctrl.getById);
router.post('/admin/campaigns', auth, authorize('Admin'), ctrl.create);
router.put('/admin/campaigns/:id', auth, authorize('Admin'), ctrl.update);
router.delete('/admin/campaigns/:id', auth, authorize('Admin'), ctrl.remove);
router.post('/admin/campaigns/:id/send', auth, authorize('Admin'), ctrl.send);
router.post('/admin/campaigns/preview-audience', auth, authorize('Admin'), ctrl.previewAudience);
router.get('/admin/campaigns/:id/analytics', auth, authorize('Admin'), ctrl.getAnalytics);

module.exports = router;
