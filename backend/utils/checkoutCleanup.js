const Booking = require('../models/Booking');
const { releaseBikeLock } = require('./bookingLock');

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

    console.log(`[Cleanup] Found ${expiredBookings.length} abandoned booking(s), releasing...`);

    for (const booking of expiredBookings) {
      try {
        await releaseBikeLock(booking.bike);

        booking.status = 'Expired';
        await booking.save();

        console.log(`[Cleanup] Released bike ${booking.bike} from expired booking ${booking._id}`);
      } catch (err) {
        console.error(`[Cleanup] Failed to clean booking ${booking._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Cleanup] Sweep error:', err.message);
  }
}

/**
 * Start the cleanup interval. Call once from server.js.
 */
function startCleanupScheduler(intervalMs = 60_000) {
  setInterval(cleanupAbandonedBookings, intervalMs);
  console.log(`[Cleanup] Scheduler started (interval: ${intervalMs / 1000}s, timeout: ${PENDING_AGE_MS / 1000}s)`);
}

module.exports = { cleanupAbandonedBookings, startCleanupScheduler };
