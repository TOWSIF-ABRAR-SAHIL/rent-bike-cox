const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getRateLimits } = require('../controllers/rateLimitController');

router.get('/admin/rate-limits', auth, authorize('Admin'), getRateLimits);

module.exports = router;
