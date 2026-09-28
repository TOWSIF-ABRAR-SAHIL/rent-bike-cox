const mongoose = require('mongoose');
const logger = require('../utils/logger');

const INTERVAL = 60 * 60 * 1000; // 1 hour
let intervalId = null;

async function cleanupOldNotifications() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const AdminNotification = require('../models/AdminNotification');
    const ContactMessage = require('../models/ContactMessage');

    // Delete admin notifications older than 90 days that are read
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedNotifs = await AdminNotification.deleteMany({
      isRead: true,
      createdAt: { $lt: ninetyDaysAgo },
    });

    // Close out stale contact messages (> 60 days).
    //
    // Two compounding bugs lived here: the archive step matched `status: 'archived'`
    // and wrote the same value back (a no-op reporting modifiedCount 0), and the
    // delete step then looked for that same status. The schema's enum is
    // ['new','open','inProgress','waitingReply','resolved','closed'] — 'archived'
    // is not a valid status, so nothing was ever archived or deleted.
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const staleStatuses = ['new', 'open', 'inProgress', 'waitingReply', 'resolved'];
    const archivedMessages = await ContactMessage.updateMany(
      { status: { $in: staleStatuses }, createdAt: { $lt: sixtyDaysAgo } },
      { $set: { status: 'closed' } }
    );

    // Delete contact messages closed over a year ago.
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const deletedMessages = await ContactMessage.deleteMany({
      status: 'closed',
      createdAt: { $lt: oneYearAgo },
    });

    logger.info('[AutoHeal] Cleanup complete', {
      deletedNotifs: deletedNotifs.deletedCount,
      archivedMessages: archivedMessages.modifiedCount,
      deletedMessages: deletedMessages.deletedCount,
    });
  } catch (err) {
    logger.error('[AutoHeal] Cleanup failed', { error: err.message });
  }
}

function startCleanupScheduler() {
  if (process.env.DISABLE_JOBS === 'true') return;
  logger.info('[AutoHeal] Starting cleanup scheduler (1h interval)');
  cleanupOldNotifications();
  intervalId = setInterval(cleanupOldNotifications, INTERVAL);
}

function stopCleanupScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { startCleanupScheduler, stopCleanupScheduler };
