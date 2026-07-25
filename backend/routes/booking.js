const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { createBooking, confirmPayment, getBookingDetails, cancelBooking, getMyBookings, getRenterBookings, getAllBookings, completeBooking, checkoutHeartbeat, extendBooking, createWalkInBooking } = require('../controllers/bookingController');

const { createBookingRules, bookingIdRules } = require('../security/validators/index');

router.get('/my-bookings', auth, getMyBookings);
router.get('/renter-bookings', auth, authorize('Renter', 'Admin'), getRenterBookings);
router.get('/admin/all', auth, authorize('Admin'), getAllBookings);
router.post('/walk-in', auth, authorize('Admin'), createWalkInBooking);
router.post('/', auth, createBookingRules, createBooking);
router.post('/confirm', auth, confirmPayment);
router.get('/:id', auth, bookingIdRules, getBookingDetails);
router.put('/:id/cancel', auth, bookingIdRules, cancelBooking);
router.put('/:id/complete', auth, authorize('Admin'), bookingIdRules, completeBooking);
router.post('/:id/heartbeat', auth, bookingIdRules, checkoutHeartbeat);
router.post('/:id/extend', auth, bookingIdRules, extendBooking);

module.exports = router;
