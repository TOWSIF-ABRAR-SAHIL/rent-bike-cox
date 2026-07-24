const { toDhakaTime } = require('./timezone');
const { multiplyPaisa, roundPaisa, percentOf } = require('./safeAmount');

const BUFFER_MINUTES = 30;
const MIN_HOURLY_RATE = 150;

function calculateHours(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.ceil(ms / (1000 * 60 * 60));
}

function isShortRental(hours) {
  return hours <= 24;
}

function getAdvancePercent(hours) {
  return isShortRental(hours) ? 0.5 : 0.3;
}

function findMatchingTier(hours, pricingTiers) {
  if (!pricingTiers || !pricingTiers.length) return null;

  let bestTier = null;
  let bestHourlyRate = Infinity;

  for (const tier of pricingTiers) {
    if (hours >= tier.minHours && (tier.maxHours === null || hours <= tier.maxHours)) {
      if (tier.hourlyRate < bestHourlyRate) {
        bestHourlyRate = tier.hourlyRate;
        bestTier = tier;
      }
    }
  }

  if (!bestTier) {
    for (const tier of pricingTiers) {
      if (hours >= tier.minHours && tier.hourlyRate < bestHourlyRate) {
        bestHourlyRate = tier.hourlyRate;
        bestTier = tier;
      }
    }
  }

  return bestTier;
}

async function calculateBookingPrice(bikePricePerHour, startTime, endTime, pricingTiers) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    throw new Error('End time must be after start time');
  }

  const hours = calculateHours(start, end);
  if (hours < 1) {
    throw new Error('Minimum rental duration is 1 hour');
  }

  let hourlyRate = bikePricePerHour;
  let packageName = `${hours} Hour${hours > 1 ? 's' : ''}`;
  let packageSource = 'hourly';

  const matchedTier = findMatchingTier(hours, pricingTiers);
  if (matchedTier) {
    hourlyRate = matchedTier.hourlyRate;
    packageName = `${matchedTier.label} (${hours}h × ${matchedTier.hourlyRate} TK/hr)`;
    packageSource = 'tier';
  }

  if (hourlyRate < MIN_HOURLY_RATE) {
    hourlyRate = MIN_HOURLY_RATE;
    if (matchedTier) {
      packageName = `${matchedTier.label} (${hours}h × ${MIN_HOURLY_RATE} TK/hr — min floor)`;
    }
  }

  let totalPrice = multiplyPaisa(hours, hourlyRate);

  const advancePercent = getAdvancePercent(hours);
  const minAdvance = percentOf(totalPrice, advancePercent * 100);

  return {
    totalPrice: roundPaisa(totalPrice),
    minAdvance: roundPaisa(minAdvance),
    hours,
    hourlyRate,
    isShortRental: isShortRental(hours),
    advancePercent,
    packageName,
    packageSource,
    startTimeDhaka: toDhakaTime(start),
    endTimeDhaka: toDhakaTime(end),
  };
}

function applyCoupon(totalPrice, discountPercent) {
  const discount = percentOf(totalPrice, discountPercent);
  return roundPaisa(totalPrice - discount);
}

module.exports = {
  calculateHours,
  isShortRental,
  getAdvancePercent,
  calculateBookingPrice,
  applyCoupon,
  findMatchingTier,
  MIN_HOURLY_RATE,
  BUFFER_MINUTES,
};
