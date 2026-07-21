const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
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
router.get('/bikes/:id', getBikeById);
router.get('/categories', getCategories);

// Renter routes
router.post('/bikes', auth, upload.array('bikeImages', 5), addBike);
router.get('/my-bikes', auth, getRenterBikes);
router.put('/bikes/:id/availability', auth, toggleBikeAvailability);

// Admin routes
router.get('/admin/bikes', auth, getAllBikes);
router.put('/admin/settings', auth, updateGlobalSettings);
router.put('/admin/bikes/:id/verify', auth, toggleBikeVerification);
router.get('/admin/users', auth, getAllUsers);
router.put('/admin/users/:id/verify', auth, toggleUserVerification);
router.get('/admin/categories', auth, getAllCategories);
router.post('/admin/categories', auth, createCategory);
router.put('/admin/categories/:id', auth, updateCategory);
router.delete('/admin/categories/:id', auth, deleteCategory);

module.exports = router;
