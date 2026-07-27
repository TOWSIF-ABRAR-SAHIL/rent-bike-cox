const express = require('express');
const router = express.Router();
const { getBikeAvailability, getAvailabilityForRange, getBikeAvailabilityHistory } = require('../controllers/availabilityController');

router.get('/bike/:bikeId', getBikeAvailability);
router.get('/range', getAvailabilityForRange);
router.get('/bike/:bikeId/history', getBikeAvailabilityHistory);

module.exports = router;
