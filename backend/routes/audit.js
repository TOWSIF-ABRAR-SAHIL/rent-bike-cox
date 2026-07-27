const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', authMiddleware, authorize('Admin'), getAuditLogs);

module.exports = router;
