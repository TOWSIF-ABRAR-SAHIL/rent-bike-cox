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

/**
 * @swagger
 * /api/dashboard/settings:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get global pricing settings
 *     responses:
 *       200:
 *         description: Global settings (base price, packages)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 basePricePerHour:
 *                   type: number
 *                 packages:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/settings', getGlobalSettings);

/**
 * @swagger
 * /api/dashboard/bikes/available:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get all available bikes for browsing
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of available bikes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bike'
 */
router.get('/bikes/available', getAvailableBikes);

/**
 * @swagger
 * /api/dashboard/bikes/{id}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get bike details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bike details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bike'
 *       404:
 *         description: Bike not found
 */
router.get('/bikes/:id', getBikeById);

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get active categories (public)
 *     responses:
 *       200:
 *         description: List of active categories
 */
router.get('/categories', getCategories);

// Renter routes

/**
 * @swagger
 * /api/dashboard/bikes:
 *   post:
 *     tags: [Dashboard]
 *     summary: Add a new bike (Renter/Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [brand, model, category, pricePerHour]
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               pricePerHour:
 *                 type: number
 *               bikeImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Bike created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a renter or admin
 */
router.post('/bikes', auth, authorize('Renter', 'Admin'), upload.array('bikeImages', 5), createBikeRules, addBike);

/**
 * @swagger
 * /api/dashboard/my-bikes:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get current renter's bikes (Renter/Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of renter's bikes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a renter or admin
 */
router.get('/my-bikes', auth, authorize('Renter', 'Admin'), getRenterBikes);

/**
 * @swagger
 * /api/dashboard/bikes/{id}/availability:
 *   put:
 *     tags: [Dashboard]
 *     summary: Toggle bike availability (Renter/Admin, must own bike)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not the bike owner
 */
router.put('/bikes/:id/availability', auth, authorize('Renter', 'Admin'), requireOwnership(Bike, 'id', 'renter'), toggleBikeAvailability);

// Admin routes

/**
 * @swagger
 * /api/dashboard/admin/bikes:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get all bikes (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All bikes in system
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/admin/bikes', auth, authorize('Admin'), getAllBikes);

/**
 * @swagger
 * /api/dashboard/admin/bikes/{id}:
 *   put:
 *     tags: [Dashboard]
 *     summary: Update a bike (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               category:
 *                 type: string
 *               pricePerHour:
 *                 type: number
 *               bikeImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Bike updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/admin/bikes/:id', auth, authorize('Admin'), upload.array('bikeImages', 5), createBikeRules, updateBike);

/**
 * @swagger
 * /api/dashboard/admin/bikes/{id}:
 *   delete:
 *     tags: [Dashboard]
 *     summary: Delete a bike (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bike deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete('/admin/bikes/:id', auth, authorize('Admin'), deleteBike);

/**
 * @swagger
 * /api/dashboard/admin/settings:
 *   put:
 *     tags: [Dashboard]
 *     summary: Update global pricing settings (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePricePerHour:
 *                 type: number
 *               packages:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Settings updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/admin/settings', auth, authorize('Admin'), updateGlobalSettings);

/**
 * @swagger
 * /api/dashboard/admin/bikes/{id}/verify:
 *   put:
 *     tags: [Dashboard]
 *     summary: Toggle bike verification status (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/admin/bikes/:id/verify', auth, authorize('Admin'), toggleBikeVerification);

/**
 * @swagger
 * /api/dashboard/admin/users:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/admin/users', auth, authorize('Admin'), getAllUsers);

/**
 * @swagger
 * /api/dashboard/admin/users/{id}/verify:
 *   put:
 *     tags: [Dashboard]
 *     summary: Toggle user verification status (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User verification toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/admin/users/:id/verify', auth, authorize('Admin'), toggleUserVerification);

/**
 * @swagger
 * /api/dashboard/admin/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get all categories including inactive (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All categories
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/admin/categories', auth, authorize('Admin'), getAllCategories);

/**
 * @swagger
 * /api/dashboard/admin/categories:
 *   post:
 *     tags: [Dashboard]
 *     summary: Create a new category (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Category already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/admin/categories', auth, authorize('Admin'), createCategory);

/**
 * @swagger
 * /api/dashboard/admin/categories/{id}:
 *   put:
 *     tags: [Dashboard]
 *     summary: Update a category (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/admin/categories/:id', auth, authorize('Admin'), updateCategory);

/**
 * @swagger
 * /api/dashboard/admin/categories/{id}:
 *   delete:
 *     tags: [Dashboard]
 *     summary: Delete a category (Admin only)
 *     description: Blocked if bikes reference this category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 *       400:
 *         description: Category in use, cannot delete
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete('/admin/categories/:id', auth, authorize('Admin'), deleteCategory);

module.exports = router;
