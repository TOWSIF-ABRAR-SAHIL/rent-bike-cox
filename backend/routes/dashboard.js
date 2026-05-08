const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { 
  addBike, 
  getRenterBikes, 
  getGlobalSettings, 
  updateGlobalSettings, 
  getAllBikes 
} = require('../controllers/dashboardController');

const upload = require('../middleware/uploadMiddleware');

// Shared/Public
router.get('/settings', getGlobalSettings);

// Renter routes
router.post('/bikes', auth, upload.array('bikeImages', 5), addBike);
router.get('/my-bikes', auth, getRenterBikes);

// Admin routes
router.get('/admin/bikes', auth, getAllBikes);
router.put('/admin/settings', auth, updateGlobalSettings);

module.exports = router;
