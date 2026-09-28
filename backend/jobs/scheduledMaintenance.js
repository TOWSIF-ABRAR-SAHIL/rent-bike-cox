const mongoose = require('mongoose');
const logger = require('../utils/logger');

const INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
let intervalId = null;

async function deactivateExpiredAnnouncements() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const Announcement = require('../models/Announcement');
    const now = new Date();

    // Deactivate announcements past their endDate
    // Field paths are nested under `schedule`. Querying bare `startDate`/`endDate`
    // matched nothing at all, so this job never expired or activated a single
    // announcement. Expiry is not a manual choice, so manuallyDisabled stays false.
    const result = await Announcement.updateMany(
      { isActive: true, 'schedule.endDate': { $lt: now } },
      { $set: { isActive: false } }
    );

    // Auto-activate announcements whose startDate has arrived.
    //
    // Skips anything an admin switched off deliberately: without this exclusion the
    // job flipped every manually disabled banner back on within six hours, so there
    // was no way to permanently disable a scheduled announcement.
    const activated = await Announcement.updateMany(
      {
        isActive: false,
        manuallyDisabled: { $ne: true },
        'schedule.startDate': { $lte: now },
        $or: [
          { 'schedule.endDate': { $gt: now } },
          { 'schedule.endDate': { $exists: false } },
          { 'schedule.endDate': null },
        ],
      },
      { $set: { isActive: true } }
    );

    if (result.modifiedCount > 0 || activated.modifiedCount > 0) {
      logger.info('[AutoHeal] Announcement schedule updated', {
        deactivated: result.modifiedCount,
        activated: activated.modifiedCount,
      });
    }
  } catch (err) {
    logger.error('[AutoHeal] Announcement scheduling failed', { error: err.message });
  }
}

async function deactivateExpiredCoupons() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const Coupon = require('../models/Coupon');
    const now = new Date();

    const result = await Coupon.updateMany(
      { isActive: true, expiresAt: { $lt: now } },
      { $set: { isActive: false } }
    );

    if (result.modifiedCount > 0) {
      logger.info('[AutoHeal] Expired coupons deactivated', { count: result.modifiedCount });
    }
  } catch (err) {
    logger.error('[AutoHeal] Coupon cleanup failed', { error: err.message });
  }
}

async function runScheduledMaintenance() {
  await deactivateExpiredAnnouncements();
  await deactivateExpiredCoupons();
}

function startScheduledMaintenance() {
  if (process.env.DISABLE_JOBS === 'true') return;
  logger.info('[AutoHeal] Starting scheduled maintenance (6h interval)');
  runScheduledMaintenance();
  intervalId = setInterval(runScheduledMaintenance, INTERVAL);
}

function stopScheduledMaintenance() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { startScheduledMaintenance, stopScheduledMaintenance };
