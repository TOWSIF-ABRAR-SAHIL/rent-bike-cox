const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createBooking, confirmPayment, getBookingDetails } = require('../controllers/bookingController');

router.post('/', auth, createBooking);
router.post('/confirm', auth, confirmPayment);
router.get('/:id', auth, getBookingDetails);

module.exports = router;
