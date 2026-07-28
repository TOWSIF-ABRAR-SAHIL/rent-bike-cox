const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getAllAdmin, adminUpdate, rollback, resetToDefault, bulkUpdate, exportContent, importContent } = require('../controllers/siteContentController');

router.get('/', auth, authorize('Admin'), getAllAdmin);
router.put('/:key', auth, authorize('Admin'), adminUpdate);
router.post('/:key/rollback', auth, authorize('Admin'), rollback);
router.post('/:key/reset', auth, authorize('Admin'), resetToDefault);
router.post('/bulk-update', auth, authorize('Admin'), bulkUpdate);
router.post('/export', auth, authorize('Admin'), exportContent);
router.post('/import', auth, authorize('Admin'), importContent);

module.exports = router;
