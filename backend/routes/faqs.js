const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/faqController');

router.get('/faqs', ctrl.getActive);
router.get('/faqs/search', ctrl.search);
router.get('/faqs/:id/related', ctrl.getRelated);
router.post('/faqs/:id/helpful', ctrl.trackHelpful);
router.get('/admin/faqs', auth, authorize('Admin'), ctrl.getAll);
router.post('/admin/faqs', auth, authorize('Admin'), ctrl.create);
// Must stay above '/admin/faqs/:id': Express matches in order, so the `:id` route
// swallowed 'reorder' first, making it a CastError 500 and the endpoint unreachable.
router.put('/admin/faqs/reorder', auth, authorize('Admin'), ctrl.reorder);
router.put('/admin/faqs/:id', auth, authorize('Admin'), ctrl.update);
router.delete('/admin/faqs/:id', auth, authorize('Admin'), ctrl.remove);
module.exports = router;
