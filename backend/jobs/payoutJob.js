const Booking = require('../models/Booking');
const PayoutService = require('../services/PayoutService');
const jobLogger = require('./logger');

const INTERVAL = 7 * 24 * 60 * 60 * 1000;
let intervalId = null;

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

function startPayoutJob() {
  if (process.env.DISABLE_JOBS === 'true') return;
  intervalId = setInterval(runPayoutJob, INTERVAL);
}

function stopPayoutJob() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startPayoutJob, stopPayoutJob, runPayoutJob };
