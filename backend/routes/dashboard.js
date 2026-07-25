const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const requireOwnership = require('../security/middleware/checkOwnership');
const Bike = require('../models/Bike');
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
  deleteCategory,
  deleteBike,
  updateBike
} = require('../controllers/dashboardController');

const { createBikeRules, paginationRules } = require('../security/validators/index');
const upload = require('../middleware/uploadMiddleware');

// Shared/Public
router.get('/settings', getGlobalSettings);
router.get('/bikes/available', getAvailableBikes);
router.get('/bikes/:id', getBikeById);
router.get('/categories', getCategories);

// Renter routes
router.post('/bikes', auth, authorize('Renter', 'Admin'), upload.array('bikeImages', 5), createBikeRules, addBike);
router.get('/my-bikes', auth, authorize('Renter', 'Admin'), getRenterBikes);
router.put('/bikes/:id/availability', auth, authorize('Renter', 'Admin'), requireOwnership(Bike, 'id', 'renter'), toggleBikeAvailability);

// Admin routes
router.get('/admin/bikes', auth, authorize('Admin'), getAllBikes);
router.put('/admin/bikes/:id', auth, authorize('Admin'), upload.array('bikeImages', 5), createBikeRules, updateBike);
router.delete('/admin/bikes/:id', auth, authorize('Admin'), requireOwnership(Bike, 'id', 'renter'), deleteBike);
router.put('/admin/settings', auth, authorize('Admin'), updateGlobalSettings);
router.put('/admin/bikes/:id/verify', auth, authorize('Admin'), toggleBikeVerification);
router.get('/admin/users', auth, authorize('Admin'), getAllUsers);
router.put('/admin/users/:id/verify', auth, authorize('Admin'), toggleUserVerification);
router.get('/admin/categories', auth, authorize('Admin'), getAllCategories);
router.post('/admin/categories', auth, authorize('Admin'), createCategory);
router.put('/admin/categories/:id', auth, authorize('Admin'), updateCategory);
router.delete('/admin/categories/:id', auth, authorize('Admin'), deleteCategory);

module.exports = router;
