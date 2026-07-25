const logger = require('../utils/logger');

const counters = {
  payment_success: 0,
  payment_fail: 0,
  payment_cancel: 0,
  booking_created: 0,
  booking_cancelled: 0,
  refund_requested: 0,
  refund_completed: 0,
};

function increment(name) {
  if (counters.hasOwnProperty(name)) counters[name]++;
}

function getMetrics() {
  return { ...counters, timestamp: new Date().toISOString() };
}

function resetMetrics() {
  for (const key of Object.keys(counters)) counters[key] = 0;
}

module.exports = { increment, getMetrics, resetMetrics };
