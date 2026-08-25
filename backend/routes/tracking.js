const express = require('express');
const router = express.Router();
const { updateLocation, getLocations, getBikeLocation, getHistory, getStats } = require('../controllers/trackingController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', updateLocation);
router.get('/', getLocations);
router.get('/stats', authMiddleware, getStats);
router.get('/history/:bikeId', authMiddleware, getHistory);
router.get('/:bikeId', authMiddleware, getBikeLocation);

module.exports = router;
