const mongoose = require('mongoose');
const logger = require('../utils/logger');

const INTERVAL = 30 * 60 * 1000; // 30 minutes
let intervalId = null;

async function healthCheck() {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[AutoHeal] DB not connected, skipping health check');
    return;
  }

  try {
    const AdminNotification = require('../models/AdminNotification');
    const Booking = require('../models/Booking');
    const Settings = require('../models/Settings');

    // 1. Check for stuck bookings (Pending > 10 min without payment)
    const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000);
    const stuckBookings = await Booking.countDocuments({
      status: 'Pending',
      createdAt: { $lt: stuckThreshold },
    });

    if (stuckBookings > 5) {
      await createAlertIfMissing(AdminNotification, {
        type: 'system',
        title: 'Stuck Pending Bookings',
        message: `${stuckBookings} bookings stuck in Pending state for >10 minutes`,
        severity: 'high',
      });
    }

    // 2. Check DB connectivity (ping)
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const dbLatency = Date.now() - start;

    if (dbLatency > 2000) {
      await createAlertIfMissing(AdminNotification, {
        type: 'system',
        title: 'Slow Database Response',
        message: `DB ping took ${dbLatency}ms (>2s threshold)`,
        severity: 'medium',
      });
    }

    // 3. Check memory usage
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / (1024 * 1024));
    if (heapUsedMB > 512) {
      await createAlertIfMissing(AdminNotification, {
        type: 'system',
        title: 'High Memory Usage',
        message: `Heap usage at ${heapUsedMB}MB (>512MB threshold)`,
        severity: 'high',
      });
    }

    logger.info('[AutoHeal] Health check complete', { stuckBookings, dbLatency, heapUsedMB });
  } catch (err) {
    logger.error('[AutoHeal] Health check failed', { error: err.message });
  }
}

async function createAlertIfMissing(Model, data) {
  const exists = await Model.findOne({
    type: data.type,
    title: data.title,
    isRead: false,
  });
  if (!exists) {
    await Model.create(data);
    logger.info(`[AutoHeal] Alert created: ${data.title}`);
  }
}

function startAutoHeal() {
  if (process.env.DISABLE_JOBS === 'true') return;
  logger.info('[AutoHeal] Starting auto-heal scheduler (30min interval)');
  healthCheck(); // run immediately
  intervalId = setInterval(healthCheck, INTERVAL);
}

function stopAutoHeal() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[AutoHeal] Stopped');
  }
}

module.exports = { startAutoHeal, stopAutoHeal };
