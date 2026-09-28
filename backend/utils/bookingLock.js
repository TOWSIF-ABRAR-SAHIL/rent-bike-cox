const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const { BUFFER_MINUTES } = require('./pricing');
const { addPaisa, subtractPaisa } = require('./safeAmount');
const { withOptionalTransaction } = require('./withOptionalTransaction');
const logger = require('./logger');

const ACTIVE_STATUSES = ['Pending', 'Confirmed'];
const bufferMs = BUFFER_MINUTES * 60 * 1000;

/**
 * Build the overlap filter for a requested window.
 *
 * Pure and shared by both the pre-check and the post-insert verification, so a
 * conflict can never be seen by one and missed by the other. Pending and
 * Confirmed bookings reserve their window; this is what makes back-to-back
 * bookings on the same vehicle possible.
 *
 * @param {string} bikeId
 * @param {Date|string} startTime
 * @param {Date|string} endTime
 * @param {{excludeBookingId?: string, excludeUserId?: string}} [opts]
 */
function buildOverlapFilter(bikeId, startTime, endTime, { excludeBookingId, excludeUserId } = {}) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const filter = {
    bike: bikeId,
    startTime: { $lt: new Date(end.getTime() + bufferMs) },
    endTime: { $gt: new Date(start.getTime() - bufferMs) },
  };

  if (excludeUserId) {
    // Ignore the requesting user's own pending checkouts, so an abandoned
    // checkout of theirs cannot block them from re-booking the same window.
    filter.$or = [
      { status: 'Confirmed' },
      { $and: [{ status: 'Pending' }, { user: { $ne: excludeUserId } }] },
    ];
  } else {
    filter.status = { $in: ACTIVE_STATUSES };
  }

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  return filter;
}

/**
 * Check whether a bike is free for the given window, including the buffer.
 * excludeBookingId: skip this booking (for extensions).
 * excludeUserId: ignore this user's own pending bookings.
 * session: optional Mongoose session for transactional reads.
 */
async function checkAvailability(bikeId, startTime, endTime, excludeBookingId = null, excludeUserId = null, session = null) {
  const query = Booking.findOne(buildOverlapFilter(bikeId, startTime, endTime, { excludeBookingId, excludeUserId }))
    .select('startTime endTime status user')
    .populate('user', 'name');

  if (session) query.session(session);

  const conflict = await query;

  if (conflict) {
    return {
      available: false,
      conflictingBooking: conflict,
      message: `Bike is not available during this time. Conflicts with an existing ${conflict.status} booking (${new Date(conflict.startTime).toLocaleString()} — ${new Date(conflict.endTime).toLocaleString()}).`,
    };
  }

  return { available: true };
}

/**
 * Create a booking only if the requested window is genuinely free.
 *
 * Vehicles are no longer globally locked while a booking exists (that hid every
 * booked bike from the marketplace); conflicts are decided by the window. Because
 * Atlas M0 offers no transactions, correctness comes from inserting first and
 * then checking whether an *older* booking overlaps — ObjectId order is the
 * tie-break, so exactly one of two racing bookings survives.
 *
 * @returns {Promise<{success: boolean, booking?: object, message?: string}>}
 */
async function createBookingAtomically(bikeId, startTime, endTime, bookingData, excludeUserId = null) {
  const availability = await checkAvailability(bikeId, startTime, endTime, null, excludeUserId);
  if (!availability.available) {
    return { success: false, message: availability.message };
  }

  const booking = await Booking.create({ ...bookingData, bike: bikeId });

  const earlier = await Booking.findOne({
    ...buildOverlapFilter(bikeId, startTime, endTime, { excludeUserId }),
    _id: { $lt: booking._id },
  }).select('_id').lean();

  if (earlier) {
    // Someone else's booking for this window already existed; step aside.
    await Booking.deleteOne({ _id: booking._id });
    logger.info('Booking lost the race for a window', {
      bikeId: String(bikeId),
      losingBooking: booking._id.toString(),
      winningBooking: earlier._id.toString(),
    });
    return {
      success: false,
      message: 'Bike is not available during this time. Another booking was just created for an overlapping period.',
    };
  }

  return { success: true, booking };
}

/**
 * Extend an existing booking: check the window after the current endTime and
 * update the booking, all inside one transaction where the deployment supports it.
 */
async function extendBookingAtomically(bookingId, newEndTime, additionalPrice) {
  return withOptionalTransaction(async (session) => {
    const bookingQuery = Booking.findById(bookingId);
    if (session) bookingQuery.session(session);
    const booking = await bookingQuery;

    if (!booking) return { success: false, message: 'Booking not found' };
    if (booking.status !== 'Confirmed') {
      return { success: false, message: 'Only confirmed bookings can be extended' };
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(newEndTime);

    if (newEnd <= currentEnd) {
      return { success: false, message: 'New end time must be after current end time' };
    }

    const availability = await checkAvailability(booking.bike, currentEnd, newEnd, booking._id, null, session);
    if (!availability.available) {
      return { success: false, message: availability.message };
    }

    const update = {
      $set: {
        endTime: newEnd,
        remainingBalance: subtractPaisa(addPaisa(booking.totalPrice, additionalPrice), booking.advancePaid),
      },
      $inc: { totalPrice: additionalPrice },
    };

    const opts = { new: true };
    if (session) opts.session = session;

    const updated = await Booking.findByIdAndUpdate(bookingId, update, opts);
    return { success: true, booking: updated };
  });
}

/**
 * Create a walk-in booking (admin only): created already paid and confirmed.
 */
async function createWalkInBooking(bikeId, startTime, endTime, bookingData) {
  const result = await createBookingAtomically(bikeId, startTime, endTime, bookingData);
  if (!result.success) return result;

  result.booking.status = 'Confirmed';
  result.booking.state = 'CONFIRMED';
  result.booking.paymentStatus = 'Partial';
  result.booking.paymentMethod = 'Walk-in Cash';
  result.booking.isWalkIn = true;
  result.booking.expiresAt = undefined;
  await result.booking.save();

  return result;
}

/**
 * List a bike back into service. `Bike.availability` is a manual out-of-service
 * switch owned by the renter/admin — booking state no longer writes to it — so
 * this only exists for admin tooling that wants to clear the flag explicitly.
 */
async function setBikeInService(bikeId, inService = true) {
  return Bike.findByIdAndUpdate(bikeId, { $set: { availability: inService } }, { new: true });
}

module.exports = {
  checkAvailability,
  buildOverlapFilter,
  setBikeInService,
  lockBikeForBooking: createBookingAtomically,
  createBookingAtomically,
  extendBookingAtomically,
  createWalkInBooking,
  ACTIVE_STATUSES,
  BUFFER_MINUTES,
};
