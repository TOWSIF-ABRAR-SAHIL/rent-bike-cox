const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getFraudEvents, getFraudReport } = require('../controllers/fraudController');

router.get('/events', authMiddleware, authorize('Admin'), getFraudEvents);
router.get('/report', authMiddleware, authorize('Admin'), getFraudReport);

module.exports = router;
