const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN } = require('../controllers/paymentController');
const { idempotencyMiddleware } = require('../utils/idempotency');
const PaymentIntent = require('../models/PaymentIntent');
const Refund = require('../models/Refund');

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
router.get('/intents', auth, authorize('Admin'), paginationRules, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const intents = await PaymentIntent.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email')
      .lean();
    const total = await PaymentIntent.countDocuments(query);
    res.json({ intents, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment intents' });
  }
});

router.get('/refunds', auth, authorize('Admin'), paginationRules, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status;
    const cappedLimit = Math.min(parseInt(limit) || 50, 100);
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * cappedLimit)
      .limit(cappedLimit)
      .populate('bookingId', 'invoiceNumber')
      .populate('userId', 'name email')
      .lean();
    const total = await Refund.countDocuments(query);
    res.json({ refunds, total, page: parseInt(page) || 1, limit: cappedLimit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds' });
  }
});

module.exports = router;
