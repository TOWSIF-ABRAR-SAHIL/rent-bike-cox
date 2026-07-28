const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getCacheStatus, flushCache, deleteCacheKey } = require('../controllers/cacheController');

router.get('/admin/cache', auth, authorize('Admin'), getCacheStatus);
router.delete('/admin/cache', auth, authorize('Admin'), flushCache);
router.delete('/admin/cache/key/:key', auth, authorize('Admin'), deleteCacheKey);

module.exports = router;
