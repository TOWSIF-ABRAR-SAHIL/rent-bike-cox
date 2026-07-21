const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { 
  addBike, 
  getRenterBikes, 
  getGlobalSettings, 
  updateGlobalSettings, 
  getAllBikes,
  getAvailableBikes,
  getBikeById,
  toggleBikeVerification,
  getAllUsers,
  toggleUserVerification,
  toggleBikeAvailability,
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/dashboardController');

const upload = require('../middleware/uploadMiddleware');

// Shared/Public
router.get('/settings', getGlobalSettings);
router.get('/bikes/available', getAvailableBikes);
router.get('/bikes/:id', validateObjectId(), getBikeById);
router.get('/categories', getCategories);

// Renter routes
router.post('/bikes', auth, upload.array('bikeImages', 5), addBike);
router.get('/my-bikes', auth, getRenterBikes);
router.put('/bikes/:id/availability', auth, validateObjectId(), toggleBikeAvailability);

// Admin routes
router.get('/admin/bikes', auth, getAllBikes);
router.put('/admin/settings', auth, updateGlobalSettings);
router.put('/admin/bikes/:id/verify', auth, validateObjectId(), toggleBikeVerification);
router.get('/admin/users', auth, getAllUsers);
router.put('/admin/users/:id/verify', auth, validateObjectId(), toggleUserVerification);
router.get('/admin/categories', auth, getAllCategories);
router.post('/admin/categories', auth, createCategory);
router.put('/admin/categories/:id', auth, validateObjectId(), updateCategory);
router.delete('/admin/categories/:id', auth, validateObjectId(), deleteCategory);

module.exports = router;
