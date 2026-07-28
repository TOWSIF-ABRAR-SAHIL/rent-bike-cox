const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/faqController');

router.get('/faqs', ctrl.getActive);
router.post('/faqs/:id/helpful', ctrl.trackHelpful);
router.get('/admin/faqs', auth, authorize('Admin'), ctrl.getAll);
router.post('/admin/faqs', auth, authorize('Admin'), ctrl.create);
router.put('/admin/faqs/:id', auth, authorize('Admin'), ctrl.update);
router.delete('/admin/faqs/:id', auth, authorize('Admin'), ctrl.remove);
router.put('/admin/faqs/reorder', auth, authorize('Admin'), ctrl.reorder);

module.exports = router;
