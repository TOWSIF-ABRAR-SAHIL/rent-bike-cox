const Booking = require('../models/Booking');
const { releaseBikeLock } = require('../utils/bookingLock');
const bus = require('../events/EventBus');
const jobLogger = require('./logger');

const INTERVAL = 60 * 1000;
let intervalId = null;

async function transitionBookingStates() {
  const log = jobLogger('bookingStateTransition');
  try {
    const now = new Date();

    const confirmed = await Booking.find({
      status: 'Confirmed',
      endTime: { $lte: now },
    });

    let completed = 0;
    for (const booking of confirmed) {
      booking.status = 'Completed';
      booking.state = 'COMPLETED';
      booking.stateHistory.push({
        from: 'CONFIRMED',
        to: 'COMPLETED',
        at: now,
        reason: 'Automatic: rental period ended',
      });
      await booking.save();
      await releaseBikeLock(booking.bike);
      bus.emit('booking.autoCompleted', { bookingId: booking._id.toString() });
      completed++;
    }

    const pending = await Booking.find({
      status: 'Pending',
      expiresAt: { $lt: now },
    });

    let expired = 0;
    for (const booking of pending) {
      booking.status = 'Expired';
      booking.state = 'EXPIRED';
      await booking.save();
      await releaseBikeLock(booking.bike);
      expired++;
    }

    log.done({ completed, expired });
  } catch (err) {
    log.error(err);
  }
}

function startBookingStateTransition() {
  if (process.env.DISABLE_JOBS === 'true') return;
  intervalId = setInterval(transitionBookingStates, INTERVAL);
  transitionBookingStates();
}

function stopBookingStateTransition() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startBookingStateTransition, stopBookingStateTransition, transitionBookingStates };
