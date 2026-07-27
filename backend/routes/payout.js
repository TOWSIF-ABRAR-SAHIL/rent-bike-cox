const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getPayouts, getPendingPayouts, approvePayout, markPayoutPaid } = require('../controllers/payoutController');

router.get('/', authMiddleware, authorize('Admin'), getPayouts);
router.get('/pending', authMiddleware, authorize('Admin'), getPendingPayouts);
router.post('/approve/:payoutId', authMiddleware, authorize('Admin'), approvePayout);
router.post('/pay/:payoutId', authMiddleware, authorize('Admin'), markPayoutPaid);

module.exports = router;
