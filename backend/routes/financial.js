const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getCircuitBreaker,
  unlockCircuitBreaker,
  getBookingLedger,
  getDailyFinancialSummary,
  getFraudReport,
  getFraudEvents,
  getFinancialOverview,
} = require('../controllers/financialController');

router.get('/admin/overview', auth, getFinancialOverview);
router.get('/admin/circuit-breaker', auth, getCircuitBreaker);
router.post('/admin/circuit-breaker/unlock', auth, unlockCircuitBreaker);
router.get('/admin/ledger/:bookingId', auth, getBookingLedger);
router.get('/admin/daily-summary', auth, getDailyFinancialSummary);
router.get('/admin/fraud-report', auth, getFraudReport);
router.get('/admin/fraud-events', auth, getFraudEvents);

module.exports = router;
