const express = require('express');
const router = express.Router();
const { updateLocation, getLocations, getBikeLocation, getHistory, getStats } = require('../controllers/trackingController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');

// IoT devices authenticate with the X-API-Key header inside the controller.
router.post('/', updateLocation);

/**
 * The live fleet map feed.
 *
 * Previously public, which published every vehicle's live position — including
 * whichever one a customer was currently riding — to anonymous visitors on the
 * home page. A session is now required unless the deployment deliberately opts in
 * by setting TRACKING_PUBLIC=true.
 */
const liveMapAccess = (req, res, next) => {
  if (process.env.TRACKING_PUBLIC === 'true') return next();
  return authMiddleware(req, res, next);
};

router.get('/', liveMapAccess, getLocations);

// Per-vehicle endpoints: operator roles only, with ownership enforced in the
// controller. These previously accepted any authenticated account, so anyone who
// signed up could pull a full movement trail for any vehicle.
router.get('/stats', authMiddleware, authorize('Renter', 'Admin'), getStats);
router.get('/history/:bikeId', authMiddleware, authorize('Renter', 'Admin'), getHistory);
router.get('/:bikeId', authMiddleware, authorize('Renter', 'Admin'), getBikeLocation);

module.exports = router;
