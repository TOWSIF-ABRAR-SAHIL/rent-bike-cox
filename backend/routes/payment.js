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
router.post('/init', auth, paymentIdempotency, paymentInitRules, initPayment);
router.get('/success/:bookingId/:tranId', paymentSuccess);
router.post('/success/:bookingId/:tranId', paymentSuccess);
router.get('/fail/:bookingId', paymentFail);
router.post('/fail/:bookingId', paymentFail);
router.get('/fail', paymentFail);
router.post('/fail', paymentFail);
router.get('/cancel/:bookingId', paymentCancel);
router.post('/cancel/:bookingId', paymentCancel);
router.get('/cancel', paymentCancel);
router.post('/cancel', paymentCancel);
router.post('/ipn', paymentIPN);

// Admin: payment intents + refunds
router.get('/intents', auth, authorize('Admin'), paginationRules, getPaymentIntents);
router.get('/refunds', auth, authorize('Admin'), paginationRules, getRefunds);
router.post('/refunds/:id/approve', auth, authorize('Admin'), approveRefund);
router.post('/refunds/:id/reject', auth, authorize('Admin'), rejectRefund);
router.post('/refunds/:id/process', auth, authorize('Admin'), processRefund);

module.exports = router;
