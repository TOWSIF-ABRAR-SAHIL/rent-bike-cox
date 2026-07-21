const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createBooking, confirmPayment, getBookingDetails, cancelBooking, getMyBookings, getRenterBookings, getAllBookings, completeBooking } = require('../controllers/bookingController');

router.get('/my-bookings', auth, getMyBookings);
router.get('/renter-bookings', auth, getRenterBookings);
router.get('/admin/all', auth, getAllBookings);
router.post('/', auth, createBooking);
router.post('/confirm', auth, confirmPayment);
router.get('/:id', auth, getBookingDetails);
router.put('/:id/cancel', auth, cancelBooking);
router.put('/:id/complete', auth, completeBooking);

module.exports = router;
