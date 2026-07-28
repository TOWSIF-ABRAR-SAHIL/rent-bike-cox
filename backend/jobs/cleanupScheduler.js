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

    // Archive old contact messages (> 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const archivedMessages = await ContactMessage.updateMany(
      { status: 'archived', createdAt: { $lt: sixtyDaysAgo } },
      { $set: { status: 'archived' } }
    );

    // Delete contact messages older than 1 year
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const deletedMessages = await ContactMessage.deleteMany({
      status: 'archived',
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
