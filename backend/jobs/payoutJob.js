const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const PayoutService = require('../services/PayoutService');
const jobLogger = require('./logger');

const INTERVAL = 7 * 24 * 60 * 60 * 1000;
const CONNECT_WAIT_MS = 30_000;
let intervalId = null;

// Jobs are started from the server.listen callback, which can fire before the Mongo
// connection is established. Mongoose buffers the query, so a first run that lands
// early fails on the buffer timeout — and the next attempt is a week away, meaning
// nobody gets paid. Wait for the connection instead of racing it.
async function waitForConnection(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() >= deadline) return false;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return true;
}

async function runPayoutJob() {
  const log = jobLogger('payoutJob');
  try {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const payouts = await PayoutService.schedulePayouts({ periodStart, periodEnd });
    log.done({ payoutsCreated: payouts.length, periodStart, periodEnd });
  } catch (err) {
    log.error(err);
  }
}

async function startPayoutJob() {
  if (process.env.DISABLE_JOBS === 'true') return;

  intervalId = setInterval(runPayoutJob, INTERVAL);
  if (typeof intervalId.unref === 'function') intervalId.unref();

  // A 7-day interval never fires on a host that redeploys or restarts more often
  // than weekly, so payouts were never scheduled. Run once on boot; the overlap
  // guard in schedulePayouts makes repeat runs safe.
  const log = jobLogger('payoutJob');
  if (!(await waitForConnection(CONNECT_WAIT_MS))) {
    log.error(new Error(`database not connected after ${CONNECT_WAIT_MS}ms — first payout run skipped`));
    return;
  }
  runPayoutJob();
}

function stopPayoutJob() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startPayoutJob, stopPayoutJob, runPayoutJob };
