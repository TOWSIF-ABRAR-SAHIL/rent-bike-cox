const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const AdminNotification = require('../models/AdminNotification');
const logger = require('../utils/logger');

const INACTIVITY_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const NOTIFICATION_DAYS = 90;
const REVIEW_LIMIT = 50;

/**
 * Flag accounts that look genuinely abandoned.
 *
 * The previous implementation anonymised users whose *registration* date was over
 * two years old and who had no bookings, wiping name, NID, licence and phone. It
 * never looked at activity, so a customer who had been logging in for years but
 * happened not to book was erased. It also left `nidHash` in place, permanently
 * blocking that NID from ever registering again.
 *
 * Nothing is mutated here. Accounts are reported so a human decides, because
 * identity erasure is not reversible and this job runs unattended every 24 hours.
 */
async function runDataRetention() {
  if (mongoose.connection.readyState !== 1) return { flagged: 0, notificationsDeleted: 0 };

  try {
    const cutoff = new Date(Date.now() - INACTIVITY_MS);

    const candidates = await User.find({
      role: 'User',
      date: { $lt: cutoff },
      // Last activity decides. `lastLoginAt` is stamped on every login/refresh;
      // users who have never logged in fall back to their registration date.
      $or: [
        { lastLoginAt: { $lt: cutoff } },
        { lastLoginAt: null, date: { $lt: cutoff } },
      ],
      email: { $not: { $regex: /^deleted_/ } },
    }).select('_id email date lastLoginAt').lean();

    const flagged = [];
    for (const user of candidates) {
      const hasBookings = await Booking.exists({ user: user._id });
      if (!hasBookings) flagged.push(user._id);
    }

    if (flagged.length > 0) {
      // Surface as an admin review item rather than deleting anything.
      const preview = flagged.slice(0, REVIEW_LIMIT);
      await AdminNotification.create({
        type: 'system',
        title: 'Accounts eligible for retention review',
        message: `${flagged.length} account(s) have had no login and no bookings for over 2 years. Review before any erasure — this job no longer anonymises automatically.`,
        severity: 'medium',
        metadata: { userIds: preview },
      });
      logger.warn('Retention review required', { count: flagged.length, sample: preview.slice(0, 5).map(String) });
    }

    // Notifications genuinely are disposable, so those are still cleaned up.
    const notifCutoff = new Date(Date.now() - NOTIFICATION_DAYS * 24 * 60 * 60 * 1000);
    const notifResult = await Notification.deleteMany({ createdAt: { $lt: notifCutoff } });
    if (notifResult.deletedCount > 0) {
      logger.info(`Cleaned up ${notifResult.deletedCount} old notifications`);
    }

    return { flagged: flagged.length, notificationsDeleted: notifResult.deletedCount };
  } catch (error) {
    logger.error('Data retention job error', { error: error.message });
    return { flagged: 0, notificationsDeleted: 0, error: error.message };
  }
}

function startDataRetention() {
  // Respect the kill switch like every other job; this one previously ignored it,
  // so it could not be disabled in local dev or tests.
  if (process.env.DISABLE_JOBS === 'true') return null;

  const timer = setInterval(runDataRetention, 24 * 60 * 60 * 1000);
  if (timer.unref) timer.unref();
  logger.info('Data retention job started (interval: 24h, review-only)');
  return timer;
}

module.exports = { startDataRetention, runDataRetention };
