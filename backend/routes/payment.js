const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN } = require('../controllers/paymentController');
const { idempotencyMiddleware } = require('../utils/idempotency');

const paymentIdempotency = idempotencyMiddleware(10 * 60 * 1000);

router.post('/init', auth, paymentIdempotency, initPayment);
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

module.exports = router;
