const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { getVehicleHistory, getVehicleStats, exportVehicleHistory } = require('../controllers/vehicleHistoryController');

router.get('/:bikeId/history', auth, authorize('Renter', 'Admin'), getVehicleHistory);
router.get('/:bikeId/stats', auth, authorize('Renter', 'Admin'), getVehicleStats);
router.get('/:bikeId/export-history', auth, authorize('Renter', 'Admin'), exportVehicleHistory);

module.exports = router;
