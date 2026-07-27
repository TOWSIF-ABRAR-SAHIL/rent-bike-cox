const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getFleetSummary, getFleetUtilization, getFleetBikes, exportFleet } = require('../controllers/fleetController');

router.get('/summary', auth, authorize('Renter', 'Admin'), getFleetSummary);
router.get('/utilization', auth, authorize('Renter', 'Admin'), getFleetUtilization);
router.get('/bikes', auth, authorize('Renter', 'Admin'), getFleetBikes);
router.get('/export', auth, authorize('Renter', 'Admin'), exportFleet);

module.exports = router;
