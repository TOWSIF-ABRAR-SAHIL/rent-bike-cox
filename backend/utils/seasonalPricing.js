const SeasonalRate = require('../models/SeasonalRate');
const { dhakaHour } = require('./timezone');

let cachedRates = [];
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadRates() {
  const now = Date.now();
  if (cachedRates.length > 0 && now < cacheExpiry) {
    return cachedRates;
  }
  cachedRates = await SeasonalRate.find({ isActive: true }).sort({ priority: -1 });
  cacheExpiry = now + CACHE_TTL;
  return cachedRates;
}

function matchesRecurring(rate, date) {
  if (!rate.recurringYearly || rate.month == null || rate.dayOfMonth == null) return false;
  return date.getMonth() + 1 === rate.month && date.getDate() === rate.dayOfMonth;
}

function matchesDateRange(rate, date) {
  if (!rate.startDate || !rate.endDate) return false;
  return date >= rate.startDate && date <= rate.endDate;
}

function matchesDayOfWeek(rate, date) {
  if (!rate.daysOfWeek || rate.daysOfWeek.length === 0) return false;
  return rate.daysOfWeek.includes(date.getDay());
}

function getApplicableRate(date) {
  const d = new Date(date);
  for (const rate of cachedRates) {
    if (rate.type === 'weekend') {
      if (matchesDayOfWeek(rate, d)) return rate;
    } else if (rate.recurringYearly) {
      if (matchesRecurring(rate, d)) return rate;
    } else if (rate.startDate && rate.endDate) {
      if (matchesDateRange(rate, d)) return rate;
    }
  }
  return null;
}

function clearCache() {
  cachedRates = [];
  cacheExpiry = 0;
}

module.exports = { loadRates, getApplicableRate, clearCache };
