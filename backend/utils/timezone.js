const DHAKA_TZ = 'Asia/Dhaka';

/**
 * Convert a Date to Asia/Dhaka formatted string.
 * @param {Date|string} date
 * @returns {string} e.g. "24 Jul 2026, 2:30 PM"
 */
function toDhakaTime(date) {
  return new Date(date).toLocaleString('en-BD', {
    timeZone: DHAKA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get the current hour in Dhaka time (0-23).
 */
function dhakaHour() {
  const now = new Date();
  const parts = now.toLocaleString('en-US', {
    timeZone: DHAKA_TZ,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(parts, 10);
}

/**
 * Check if a date falls on a different day in Dhaka timezone.
 */
function isDhakaDifferentDay(date1, date2) {
  const d1 = new Date(date1).toLocaleDateString('en-CA', { timeZone: DHAKA_TZ });
  const d2 = new Date(date2).toLocaleDateString('en-CA', { timeZone: DHAKA_TZ });
  return d1 !== d2;
}

module.exports = { toDhakaTime, dhakaHour, isDhakaDifferentDay, DHAKA_TZ };
