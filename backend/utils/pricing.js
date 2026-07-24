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

function durationToHours(pkg) {
  switch (pkg.durationType) {
    case 'hour': return pkg.durationValue;
    case 'day': return pkg.durationValue * 24;
    case 'week': return pkg.durationValue * 24 * 7;
    case 'month': return pkg.durationValue * 24 * 30;
    default: return pkg.durationValue;
  }
}

function findBestBikePackage(hours, bikePackages) {
  if (!bikePackages || !bikePackages.length) return null;

  let bestPkg = null;
  let bestCostPerHour = Infinity;

  for (const pkg of bikePackages) {
    const pkgHours = durationToHours(pkg);
    if (pkgHours >= hours && pkg.price / pkgHours < bestCostPerHour) {
      bestCostPerHour = pkg.price / pkgHours;
      bestPkg = pkg;
    }
  }

  return bestPkg;
}

async function calculateBookingPrice(bikePricePerHour, startTime, endTime, packageIndex, bikePackages) {
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
  let packageSource = 'hourly';

  if (packageIndex !== undefined && packageIndex !== null) {
    if (bikePackages && bikePackages[packageIndex]) {
      const pkg = bikePackages[packageIndex];
      totalPrice = pkg.price;
      packageName = pkg.label;
      packageSource = 'bike_package';
    } else {
      const settings = await Settings.findOne();
      if (settings && settings.packages[packageIndex]) {
        const pkg = settings.packages[packageIndex];
        totalPrice = pkg.price;
        packageName = pkg.name;
        packageSource = 'global_package';
      } else {
        throw new Error('Invalid package selected');
      }
    }
  } else {
    totalPrice = multiplyPaisa(hours, bikePricePerHour);
    packageName = `${hours} Hour${hours > 1 ? 's' : ''}`;

    const bestBikePkg = findBestBikePackage(hours, bikePackages);
    if (bestBikePkg) {
      const bikeCost = bestBikePkg.price;
      if (bikeCost < totalPrice) {
        totalPrice = bikeCost;
        packageName = bestBikePkg.label;
        packageSource = 'bike_package_auto';
      }
    }

    if (packageSource === 'hourly') {
      const settings = await Settings.findOne();
      if (settings?.packages?.length) {
        const dailyRate = settings.packages[0]?.price;
        if (dailyRate && totalPrice > dailyRate) {
          totalPrice = dailyRate;
          packageName = '1 Day (auto-applied — best rate)';
          packageSource = 'global_package_auto';
        }
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
  durationToHours,
  findBestBikePackage,
  BUFFER_MINUTES,
};
