const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { initPayment, paymentSuccess, paymentFail, paymentCancel } = require('../controllers/paymentController');

router.post('/init', auth, initPayment);
router.post('/success/:bookingId/:tranId', paymentSuccess);
router.post('/fail', paymentFail);
router.post('/cancel', paymentCancel);

module.exports = router;
