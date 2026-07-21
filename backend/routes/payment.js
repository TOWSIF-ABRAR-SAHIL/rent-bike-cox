const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN } = require('../controllers/paymentController');

router.post('/init', auth, initPayment);
router.get('/success/:bookingId/:tranId', validateObjectId('bookingId'), paymentSuccess);
router.post('/success/:bookingId/:tranId', validateObjectId('bookingId'), paymentSuccess);
router.get('/fail', paymentFail);
router.post('/fail', paymentFail);
router.get('/cancel', paymentCancel);
router.post('/cancel', paymentCancel);
router.post('/ipn', paymentIPN);

module.exports = router;
