const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { createBooking, confirmPayment, getBookingDetails, cancelBooking, getMyBookings, getRenterBookings, getAllBookings, completeBooking } = require('../controllers/bookingController');

router.get('/my-bookings', auth, getMyBookings);
router.get('/renter-bookings', auth, getRenterBookings);
router.get('/admin/all', auth, getAllBookings);
router.post('/', auth, createBooking);
router.post('/confirm', auth, confirmPayment);
router.get('/:id', auth, validateObjectId(), getBookingDetails);
router.put('/:id/cancel', auth, validateObjectId(), cancelBooking);
router.put('/:id/complete', auth, validateObjectId(), completeBooking);

module.exports = router;
