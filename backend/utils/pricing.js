const Settings = require('../models/Settings');
const { toDhakaTime } = require('./timezone');
const { multiplyPaisa, roundPaisa, percentOf } = require('./safeAmount');

const BUFFER_MINUTES = 30;

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

async function calculateBookingPrice(bikePricePerHour, startTime, endTime, packageIndex) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    throw new Error('End time must be after start time');
  }

  const hours = calculateHours(start, end);
  if (hours < 1) {
    throw new Error('Minimum rental duration is 1 hour');
  }

  let totalPrice;
  let packageName;

  if (packageIndex !== undefined && packageIndex !== null) {
    const settings = await Settings.findOne();
    if (!settings || !settings.packages[packageIndex]) {
      throw new Error('Invalid package selected');
    }
    const pkg = settings.packages[packageIndex];
    totalPrice = pkg.price;
    packageName = pkg.name;
  } else {
    totalPrice = multiplyPaisa(hours, bikePricePerHour);
    packageName = 'Hourly';

    const settings = await Settings.findOne();
    if (settings?.packages?.length) {
      const dailyRate = settings.packages[0]?.price;
      if (dailyRate && totalPrice > dailyRate) {
        totalPrice = dailyRate;
        packageName = '1 Day (auto-applied — best rate)';
      }
    }
  }

  const advancePercent = getAdvancePercent(hours);
  const minAdvance = percentOf(totalPrice, advancePercent * 100);

  return {
    totalPrice: roundPaisa(totalPrice),
    minAdvance: roundPaisa(minAdvance),
    hours,
    isShortRental: isShortRental(hours),
    advancePercent,
    packageName,
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
  BUFFER_MINUTES,
};
