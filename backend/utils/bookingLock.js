const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const { BUFFER_MINUTES } = require('./pricing');
const { addPaisa } = require('./safeAmount');

const ACTIVE_STATUSES = ['Pending', 'Confirmed'];
const bufferMs = BUFFER_MINUTES * 60 * 1000;

/**
 * Check if a bike is available for the given time window, including buffer.
 * excludeBookingId: skip this booking (for extensions).
 * session: optional Mongoose session for transactional reads.
 */
async function checkAvailability(bikeId, startTime, endTime, excludeBookingId = null, session = null) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const bufferStart = new Date(start.getTime() - bufferMs);
  const bufferEnd = new Date(end.getTime() + bufferMs);

  const matchQuery = {
    bike: bikeId,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: bufferEnd },
    endTime: { $gt: bufferStart },
  };

  if (excludeBookingId) {
    matchQuery._id = { $ne: excludeBookingId };
  }

  const query = Booking.findOne(matchQuery)
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
 * CAS lock: set availability false only if currently true.
 * session: optional Mongoose session.
 */
async function atomicLockBike(bikeId, session = null) {
  const opts = { new: true };
  if (session) opts.session = session;

  return Bike.findOneAndUpdate(
    { _id: bikeId, availability: true },
    { $set: { availability: false } },
    opts
  );
}

/**
 * Release bike lock — only if no other active bookings exist.
 * session: optional Mongoose session.
 */
async function releaseBikeLock(bikeId, session = null) {
  const existsQuery = Booking.exists({
    bike: bikeId,
    status: { $in: ACTIVE_STATUSES },
  });
  if (session) existsQuery.session(session);

  const hasActive = await existsQuery;
  if (!hasActive) {
    const opts = {};
    if (session) opts.session = session;
    await Bike.findByIdAndUpdate(bikeId, { $set: { availability: true } }, opts);
  }
}

/**
 * Transactional booking: check + lock + create in one atomic unit.
 * Falls back to CAS if replica set unavailable (Atlas M0).
 * Returns { success, booking?, message? }
 */
async function createBookingAtomically(bikeId, startTime, endTime, bookingData) {
  let session;
  try {
    session = await mongoose.startSession();
    await session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    const availability = await checkAvailability(bikeId, startTime, endTime, null, session);
    if (!availability.available) {
      await session.abortTransaction();
      return { success: false, message: availability.message };
    }

    const bike = await atomicLockBike(bikeId, session);
    if (!bike) {
      await session.abortTransaction();
      return { success: false, message: 'Bike is no longer available. Another booking may have been confirmed.' };
    }

    const [booking] = await Booking.create([{ ...bookingData, bike: bikeId }], { session });

    await session.commitTransaction();
    return { success: true, booking };
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch {}
    }

    if (err.name === 'MongoServerError' && err.code === 48) {
      console.warn('[BookingLock] Transactions not supported — falling back to CAS');
      return createBookingCAS(bikeId, startTime, endTime, bookingData);
    }

    throw err;
  } finally {
    if (session) session.endSession();
  }
}

/**
 * CAS fallback: check availability then lock, non-transactional.
 * Used when replica set is not available (e.g., Atlas M0).
 */
async function createBookingCAS(bikeId, startTime, endTime, bookingData) {
  const availability = await checkAvailability(bikeId, startTime, endTime);
  if (!availability.available) {
    return { success: false, message: availability.message };
  }

  const bike = await atomicLockBike(bikeId);
  if (!bike) {
    return { success: false, message: 'Bike is no longer available. Another booking may have been confirmed.' };
  }

  const booking = await Booking.create({ ...bookingData, bike: bikeId });
  return { success: true, booking };
}

/**
 * Extend an existing booking: check buffer after current endTime, create new lock if needed.
 */
async function extendBookingAtomically(bookingId, newEndTime, additionalPrice) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.status !== 'Confirmed') return { success: false, message: 'Only confirmed bookings can be extended' };

  const currentEnd = new Date(booking.endTime);
  const newEnd = new Date(newEndTime);

  if (newEnd <= currentEnd) {
    return { success: false, message: 'New end time must be after current end time' };
  }

  const availability = await checkAvailability(booking.bike, currentEnd, newEnd, booking._id);
  if (!availability.available) {
    return { success: false, message: availability.message };
  }

  booking.endTime = newEnd;
  booking.totalPrice = addPaisa(booking.totalPrice, additionalPrice);
  await booking.save();

  return { success: true, booking };
}

/**
 * Create a walk-in booking (admin only): immediate confirm + lock.
 */
async function createWalkInBooking(bikeId, startTime, endTime, bookingData) {
  const result = await createBookingAtomically(bikeId, startTime, endTime, bookingData);
  if (!result.success) return result;

  result.booking.status = 'Confirmed';
  result.booking.paymentStatus = 'Partial';
  result.booking.paymentMethod = 'Walk-in Cash';
  result.booking.expiresAt = undefined;
  await result.booking.save();

  return result;
}

module.exports = {
  checkAvailability,
  atomicLockBike,
  releaseBikeLock,
  lockBikeForBooking: createBookingAtomically,
  createBookingAtomically,
  createBookingCAS,
  extendBookingAtomically,
  createWalkInBooking,
};
