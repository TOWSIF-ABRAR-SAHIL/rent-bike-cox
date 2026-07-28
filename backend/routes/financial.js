const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  getCircuitBreaker,
  unlockCircuitBreaker,
  getBookingLedger,
  getDailyFinancialSummary,
  getFraudReport,
  getFraudEvents,
  getFinancialOverview,
  getRenterEarnings,
} = require('../controllers/financialController');

router.get('/admin/overview', auth, authorize('Admin'), getFinancialOverview);
router.get('/admin/circuit-breaker', auth, authorize('Admin'), getCircuitBreaker);
router.post('/admin/circuit-breaker/unlock', auth, authorize('Admin'), unlockCircuitBreaker);
router.get('/admin/ledger/:bookingId', auth, authorize('Admin'), getBookingLedger);
router.get('/admin/daily-summary', auth, authorize('Admin'), getDailyFinancialSummary);
router.get('/admin/fraud-report', auth, authorize('Admin'), getFraudReport);
router.get('/admin/fraud-events', auth, authorize('Admin'), getFraudEvents);
router.get('/renter/earnings', auth, getRenterEarnings);

module.exports = router;
