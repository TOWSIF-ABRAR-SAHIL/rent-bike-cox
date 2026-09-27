const Booking = require('../models/Booking');
const logger = require('./logger');

const PENDING_AGE_MS = 5 * 60 * 1000;

/**
 * Find and clean up abandoned pending bookings.
 * Called periodically via setInterval in server.js.
 */
async function cleanupAbandonedBookings() {
  try {
    const cutoff = new Date(Date.now() - PENDING_AGE_MS);

    const expiredBookings = await Booking.find({
      status: 'Pending',
      expiresAt: { $lte: cutoff },
    }).select('bike couponApplied user');

    if (expiredBookings.length === 0) return;

    logger.info(`Found ${expiredBookings.length} abandoned booking(s), releasing...`);

    for (const booking of expiredBookings) {
      try {
        booking.status = 'Expired';
        await booking.save();

        logger.info(`Expired abandoned booking ${booking._id}`);
      } catch (err) {
        logger.error(`Failed to clean booking ${booking._id}`, { error: err.message });
      }
    }
  } catch (err) {
    logger.error('Sweep error', { error: err.message });
  }
}

/**
 * Start the cleanup interval. Call once from server.js.
 */
function startCleanupScheduler(intervalMs = 60_000) {
  const timer = setInterval(cleanupAbandonedBookings, intervalMs);
  if (timer.unref) timer.unref();
  logger.info(`Cleanup scheduler started`, { interval: `${intervalMs / 1000}s`, timeout: `${PENDING_AGE_MS / 1000}s` });
}

module.exports = { cleanupAbandonedBookings, startCleanupScheduler };
