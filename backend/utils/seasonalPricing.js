const SeasonalRate = require('../models/SeasonalRate');
const { DHAKA_TZ } = require('./timezone');

/**
 * Day-of-week and calendar date as they are in Dhaka.
 *
 * Rates used to be matched with getDay()/getMonth()/getDate() on the server clock,
 * which is UTC on Render — six hours behind Dhaka. A Saturday 02:00 booking was
 * therefore matched as a Friday, and holiday dates shifted for any booking made
 * after 18:00 local time.
 */
function dhakaParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(date));

  const get = type => parts.find(p => p.type === type)?.value;
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    dayOfMonth: Number(get('day')),
    dayOfWeek: weekdayIndex,
  };
}

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
  const { month, dayOfMonth } = dhakaParts(date);
  return month === rate.month && dayOfMonth === rate.dayOfMonth;
}

function matchesDateRange(rate, date) {
  if (!rate.startDate || !rate.endDate) return false;
  const d = new Date(date);
  return d >= rate.startDate && d <= rate.endDate;
}

function matchesDayOfWeek(rate, date) {
  if (!rate.daysOfWeek || rate.daysOfWeek.length === 0) return false;
  return rate.daysOfWeek.includes(dhakaParts(date).dayOfWeek);
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

module.exports = { loadRates, getApplicableRate, clearCache, dhakaParts };
