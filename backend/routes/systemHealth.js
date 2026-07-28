const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/systemHealthController');

router.get('/admin/system-health', auth, authorize('Admin'), ctrl.getSystemHealth);

module.exports = router;
