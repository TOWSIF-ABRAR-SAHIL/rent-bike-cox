const Money = require('../domain/Money');
const { MIN_HOURLY_RATE, BUFFER_MINUTES } = require('../utils/pricing');
const { findMatchingTier, getAdvancePercent } = require('../utils/pricing');
const logger = require('../utils/logger');
const Settings = require('../models/Settings');

class PricingService {
  async getHourlyRate() {
    const settings = await Settings.findOne();
    return settings?.basePricePerHour || 200;
  }

  async calculatePrice({ startTime, endTime, pricingTiers, bikePricePerHour }) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) throw new Error('End time must be after start time');

    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    if (hours < 1) throw new Error('Minimum rental duration is 1 hour');

    let hourlyRate = bikePricePerHour || await this.getHourlyRate();
    let packageName = `${hours} Hour${hours > 1 ? 's' : ''}`;
    let packageSource = 'hourly';
    let matchedTier = null;

    if (pricingTiers && pricingTiers.length) {
      matchedTier = findMatchingTier(hours, pricingTiers);
      if (matchedTier) {
        hourlyRate = matchedTier.hourlyRate;
        packageName = matchedTier.label;
        packageSource = 'tier';
      }
    }

    if (hourlyRate < MIN_HOURLY_RATE) {
      hourlyRate = MIN_HOURLY_RATE;
      if (matchedTier) {
        packageName = `${matchedTier.label} (min floor)`;
      }
    }

    const subtotal = Money.fromPaisa(hours * hourlyRate * 100);
    const advancePercent = getAdvancePercent(hours);
    const advance = subtotal.percentage(advancePercent * 100);
    const remaining = subtotal.subtract(advance);

    return {
      subtotal,
      advance,
      remaining,
      hours,
      hourlyRate,
      isShortRental: hours <= 24,
      advancePercent,
      packageName,
      packageSource,
      matchedTier,
    };
  }

  calculateCommission(totalPaisa, commissionPercent = 10) {
    const total = Money.fromPaisa(totalPaisa);
    const commission = total.percentage(commissionPercent);
    const renterEarnings = total.subtract(commission);
    return { commission, renterEarnings };
  }

  applyCoupon(totalPaisa, coupon) {
    const total = Money.fromPaisa(totalPaisa);
    if (coupon.discountType === 'FIXED') {
      const discount = Money.fromPaisa(coupon.discountFixedPaisa || 0);
      return { discounted: total.subtract(discount), discount };
    }
    const discount = total.percentage(coupon.discountPercent || 0);
    if (coupon.maxDiscountPaisa && discount.isGreaterThan(Money.fromPaisa(coupon.maxDiscountPaisa))) {
      const capped = Money.fromPaisa(coupon.maxDiscountPaisa);
      return { discounted: total.subtract(capped), discount: capped };
    }
    return { discounted: total.subtract(discount), discount };
  }
}

module.exports = new PricingService();
