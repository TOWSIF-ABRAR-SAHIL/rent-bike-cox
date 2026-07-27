const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const PaymentIntent = require('../models/PaymentIntent');
const { releaseBikeLock } = require('../utils/bookingLock');
const jobLogger = require('./logger');

const CLEANUP_INTERVAL = 5 * 60 * 1000;
let intervalId = null;

async function cleanupExpiredIntents() {
  if (mongoose.connection.readyState !== 1) return;
  const log = jobLogger('expiredIntentCleanup');
  try {
    const expiredIntents = await PaymentIntent.find({
      status: { $in: ['INITIATED', 'PROCESSING'] },
      expiresAt: { $lt: new Date() },
    });

    let released = 0;
    for (const intent of expiredIntents) {
      intent.status = 'EXPIRED';
      await intent.save();

      const booking = await Booking.findById(intent.bookingId);
      if (booking && booking.status === 'Pending') {
        booking.status = 'Expired';
        booking.state = 'EXPIRED';
        await booking.save();
        await releaseBikeLock(booking.bike);
        released++;
      }
    }

    log.done({ expired: expiredIntents.length, released });
  } catch (err) {
    log.error(err);
  }
}

function startExpiredIntentCleanup() {
  if (process.env.DISABLE_JOBS === 'true') return;
  intervalId = setInterval(cleanupExpiredIntents, CLEANUP_INTERVAL);
  cleanupExpiredIntents();
}

function stopExpiredIntentCleanup() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startExpiredIntentCleanup, stopExpiredIntentCleanup, cleanupExpiredIntents };
