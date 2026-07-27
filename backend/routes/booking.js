const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { createBooking, confirmPayment, getBookingDetails, cancelBooking, getMyBookings, getRenterBookings, getAllBookings, completeBooking, checkoutHeartbeat, extendBooking, createWalkInBooking } = require('../controllers/bookingController');

const { createBookingRules, bookingIdRules } = require('../security/validators/index');

/**
 * @swagger
 * /api/booking/my-bookings:
 *   get:
 *     tags: [Booking]
 *     summary: Get current user's bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 */
router.get('/my-bookings', auth, getMyBookings);

/**
 * @swagger
 * /api/booking/renter-bookings:
 *   get:
 *     tags: [Booking]
 *     summary: Get bookings for renter's vehicles (Renter/Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of renter bookings
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a renter or admin
 */
router.get('/renter-bookings', auth, authorize('Renter', 'Admin'), getRenterBookings);

/**
 * @swagger
 * /api/booking/admin/all:
 *   get:
 *     tags: [Booking]
 *     summary: Get all bookings (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All bookings in system
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/admin/all', auth, authorize('Admin'), getAllBookings);

/**
 * @swagger
 * /api/booking/walk-in:
 *   post:
 *     tags: [Booking]
 *     summary: Create walk-in booking (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bikeId, startTime]
 *             properties:
 *               bikeId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Walk-in booking created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/walk-in', auth, authorize('Admin'), createWalkInBooking);

/**
 * @swagger
 * /api/booking:
 *   post:
 *     tags: [Booking]
 *     summary: Create a new booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bikeId, startTime]
 *             properties:
 *               bikeId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Booking created (Pending payment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error or bike unavailable
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, createBookingRules, createBooking);

/**
 * @swagger
 * /api/booking/confirm:
 *   post:
 *     tags: [Booking]
 *     summary: Confirm booking after payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, tranId]
 *             properties:
 *               bookingId:
 *                 type: string
 *               tranId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Invalid payment
 *       401:
 *         description: Unauthorized
 */
router.post('/confirm', auth, confirmPayment);

/**
 * @swagger
 * /api/booking/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Get booking details by ID
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
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get('/:id', auth, bookingIdRules, getBookingDetails);

/**
 * @swagger
 * /api/booking/{id}/cancel:
 *   put:
 *     tags: [Booking]
 *     summary: Cancel a booking
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
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel (too late or already active)
 *       401:
 *         description: Unauthorized
 */
router.put('/:id/cancel', auth, bookingIdRules, cancelBooking);

/**
 * @swagger
 * /api/booking/{id}/complete:
 *   put:
 *     tags: [Booking]
 *     summary: Mark booking as completed (Admin only)
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
 *         description: Booking completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/:id/complete', auth, authorize('Admin'), bookingIdRules, completeBooking);

/**
 * @swagger
 * /api/booking/{id}/heartbeat:
 *   post:
 *     tags: [Booking]
 *     summary: Checkout heartbeat — confirm user is present
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
 *         description: Heartbeat acknowledged
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/heartbeat', auth, bookingIdRules, checkoutHeartbeat);

/**
 * @swagger
 * /api/booking/{id}/extend:
 *   post:
 *     tags: [Booking]
 *     summary: Extend an active booking
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
 *             required: [additionalHours]
 *             properties:
 *               additionalHours:
 *                 type: number
 *     responses:
 *       200:
 *         description: Booking extended
 *       400:
 *         description: Cannot extend
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/extend', auth, bookingIdRules, extendBooking);

module.exports = router;
