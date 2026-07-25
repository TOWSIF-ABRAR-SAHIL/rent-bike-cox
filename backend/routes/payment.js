const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN } = require('../controllers/paymentController');
const { idempotencyMiddleware } = require('../utils/idempotency');
const PaymentIntent = require('../models/PaymentIntent');
const Refund = require('../models/Refund');

const paymentIdempotency = idempotencyMiddleware(10 * 60 * 1000);

// SSLCommerz payment flow
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

// Admin: payment intents + refunds
router.get('/intents', auth, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const intents = await PaymentIntent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email');
    const total = await PaymentIntent.countDocuments(query);
    res.json({ intents, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment intents' });
  }
});

router.get('/refunds', auth, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email');
    const total = await Refund.countDocuments(query);
    res.json({ refunds, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds' });
  }
});

module.exports = router;
