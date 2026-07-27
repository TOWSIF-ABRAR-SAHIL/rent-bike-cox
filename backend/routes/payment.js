const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN } = require('../controllers/paymentController');
const { getPaymentIntents, getRefunds, approveRefund, rejectRefund, processRefund } = require('../controllers/paymentAdminController');
const { idempotencyMiddleware } = require('../utils/idempotency');

const { paymentInitRules, paginationRules } = require('../security/validators/index');

const paymentIdempotency = idempotencyMiddleware(10 * 60 * 1000);

// SSLCommerz payment flow

/**
 * @swagger
 * /api/payment/init:
 *   post:
 *     tags: [Payment]
 *     summary: Initialize SSLCommerz payment for a booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment gateway URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gatewayUrl:
 *                   type: string
 *                   format: uri
 *       400:
 *         description: Invalid booking or already paid
 *       401:
 *         description: Unauthorized
 */
router.post('/init', auth, paymentIdempotency, paymentInitRules, initPayment);

/**
 * @swagger
 * /api/payment/success/{bookingId}/{tranId}:
 *   get:
 *     tags: [Payment]
 *     summary: Payment success callback (SSLCommerz redirect)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tranId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend invoice page
 */
router.get('/success/:bookingId/:tranId', paymentSuccess);

/**
 * @swagger
 * /api/payment/success/{bookingId}/{tranId}:
 *   post:
 *     tags: [Payment]
 *     summary: Payment success callback (SSLCommerz POST)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tranId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment processed
 */
router.post('/success/:bookingId/:tranId', paymentSuccess);

/**
 * @swagger
 * /api/payment/fail/{bookingId}:
 *   get:
 *     tags: [Payment]
 *     summary: Payment failure callback (SSLCommerz redirect)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend payment-failed page
 */
router.get('/fail/:bookingId', paymentFail);

/**
 * @swagger
 * /api/payment/fail/{bookingId}:
 *   post:
 *     tags: [Payment]
 *     summary: Payment failure callback (SSLCommerz POST)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Failure processed
 */
router.post('/fail/:bookingId', paymentFail);

/**
 * @swagger
 * /api/payment/fail:
 *   get:
 *     tags: [Payment]
 *     summary: Payment failure (no booking ID)
 *     responses:
 *       302:
 *         description: Redirects to frontend
 */
router.get('/fail', paymentFail);

/**
 * @swagger
 * /api/payment/fail:
 *   post:
 *     tags: [Payment]
 *     summary: Payment failure (no booking ID, SSLCommerz POST)
 *     responses:
 *       200:
 *         description: Failure processed
 */
router.post('/fail', paymentFail);

/**
 * @swagger
 * /api/payment/cancel/{bookingId}:
 *   get:
 *     tags: [Payment]
 *     summary: Payment cancel callback (SSLCommerz redirect)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend
 */
router.get('/cancel/:bookingId', paymentCancel);

/**
 * @swagger
 * /api/payment/cancel/{bookingId}:
 *   post:
 *     tags: [Payment]
 *     summary: Payment cancel callback (SSLCommerz POST)
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancellation processed
 */
router.post('/cancel/:bookingId', paymentCancel);

/**
 * @swagger
 * /api/payment/cancel:
 *   get:
 *     tags: [Payment]
 *     summary: Payment cancel (no booking ID)
 *     responses:
 *       302:
 *         description: Redirects to frontend
 */
router.get('/cancel', paymentCancel);

/**
 * @swagger
 * /api/payment/cancel:
 *   post:
 *     tags: [Payment]
 *     summary: Payment cancel (no booking ID, SSLCommerz POST)
 *     responses:
 *       200:
 *         description: Cancellation processed
 */
router.post('/cancel', paymentCancel);

/**
 * @swagger
 * /api/payment/ipn:
 *   post:
 *     tags: [Payment]
 *     summary: SSLCommerz Instant Payment Notification (IPN)
 *     description: Server-to-server callback from SSLCommerz to verify payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: IPN processed
 */
router.post('/ipn', paymentIPN);

// Admin: payment intents + refunds

/**
 * @swagger
 * /api/payment/intents:
 *   get:
 *     tags: [Admin Refunds]
 *     summary: List payment intents (Admin only)
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
 *         description: Paginated payment intents
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/intents', auth, authorize('Admin'), paginationRules, getPaymentIntents);

/**
 * @swagger
 * /api/payment/refunds:
 *   get:
 *     tags: [Admin Refunds]
 *     summary: List refund requests (Admin only)
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
 *         description: Paginated refunds
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/refunds', auth, authorize('Admin'), paginationRules, getRefunds);

/**
 * @swagger
 * /api/payment/refunds/{id}/approve:
 *   post:
 *     tags: [Admin Refunds]
 *     summary: Approve a refund request (Admin only)
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
 *         description: Refund approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/refunds/:id/approve', auth, authorize('Admin'), approveRefund);

/**
 * @swagger
 * /api/payment/refunds/{id}/reject:
 *   post:
 *     tags: [Admin Refunds]
 *     summary: Reject a refund request (Admin only)
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
 *         description: Refund rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/refunds/:id/reject', auth, authorize('Admin'), rejectRefund);

/**
 * @swagger
 * /api/payment/refunds/{id}/process:
 *   post:
 *     tags: [Admin Refunds]
 *     summary: Process an approved refund via SSLCommerz (Admin only)
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
 *         description: Refund processed
 *       400:
 *         description: Refund already processed or failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/refunds/:id/process', auth, authorize('Admin'), processRefund);

module.exports = router;
