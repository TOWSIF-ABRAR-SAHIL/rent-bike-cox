const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getLogs } = require('../controllers/logController');

router.get('/admin/logs', auth, authorize('Admin'), getLogs);

module.exports = router;
