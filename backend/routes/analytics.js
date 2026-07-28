const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  getRevenueAnalytics,
  getBookingTrends,
  getCategoryPerformance,
  getTopBikes,
  getCustomerInsights,
  exportAnalytics,
  getZoneAnalytics,
  getRentalDuration,
  getFinancialSummary,
} = require('../controllers/analyticsController');

router.get('/revenue', auth, authorize('Admin'), getRevenueAnalytics);
router.get('/bookings', auth, authorize('Admin'), getBookingTrends);
router.get('/categories', auth, authorize('Admin'), getCategoryPerformance);
router.get('/top-bikes', auth, authorize('Admin'), getTopBikes);
router.get('/customers', auth, authorize('Admin'), getCustomerInsights);
router.get('/zones', auth, authorize('Admin'), getZoneAnalytics);
router.get('/duration', auth, authorize('Admin'), getRentalDuration);
router.get('/financial', auth, authorize('Admin'), getFinancialSummary);
router.get('/export', auth, authorize('Admin'), exportAnalytics);

module.exports = router;
