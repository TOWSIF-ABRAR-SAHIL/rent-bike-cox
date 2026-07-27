const Coupon = require('../models/Coupon');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class CouponService {
  async validateCoupon({ code, userId, totalAmountPaisa, bikeCategory }) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) throw new Error('Invalid coupon code');
    if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new Error('Coupon has expired');
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new Error('Coupon usage limit reached');
    if (coupon.maxUsesPerUser > 0) {
      const userUses = coupon.usedBy.filter(u => u.user?.toString() === userId).length;
      if (userUses >= coupon.maxUsesPerUser) throw new Error('You have already used this coupon');
    }
    if (coupon.firstTimeUserOnly) {
      const totalUses = await require('../models/Booking').countDocuments({ user: userId, status: { $ne: 'Cancelled' } });
      if (totalUses > 0) throw new Error('This coupon is for first-time users only');
    }
    if (coupon.minBookingAmountPaisa && totalAmountPaisa < coupon.minBookingAmountPaisa) {
      throw new Error(`Minimum booking amount is ${(coupon.minBookingAmountPaisa / 100).toFixed(0)} TK`);
    }
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && bikeCategory) {
      const catId = bikeCategory._id?.toString() || bikeCategory.toString();
      if (!coupon.applicableCategories.some(c => c.toString() === catId)) {
        throw new Error('This coupon is not applicable for this vehicle category');
      }
    }
    return coupon;
  }

  async applyCoupon({ couponId, userId, bookingId }) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new Error('Coupon not found');
    if (!coupon.isActive) throw new Error('Coupon is no longer active');
    if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new Error('Coupon has expired');
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new Error('Coupon usage limit reached');

    const userUses = coupon.usedBy.filter(u => u.user?.toString() === userId).length;
    if (coupon.maxUsesPerUser > 0 && userUses >= coupon.maxUsesPerUser) throw new Error('Per-user usage limit reached');

    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usedCount: 1 },
      $push: { usedBy: { user: userId, booking: bookingId, usedAt: new Date() } },
    });

    bus.emit('coupon.applied', { couponId, userId, bookingId });
    logger.info('Coupon applied', { couponId, userId, bookingId });

    return coupon;
  }

  async releaseCoupon({ couponId, userId, bookingId }) {
    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usedCount: -1 },
      $pull: { usedBy: { user: userId, booking: bookingId } },
    });

    bus.emit('coupon.released', { couponId, userId, bookingId });
    logger.info('Coupon released', { couponId, userId, bookingId });
  }
}

module.exports = new CouponService();
