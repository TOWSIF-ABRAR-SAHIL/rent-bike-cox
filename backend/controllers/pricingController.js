const Bike = require('../models/Bike');
const Coupon = require('../models/Coupon');
const { calculateBookingPrice, applyCoupon } = require('../utils/pricing');
const { checkAvailability } = require('../utils/bookingLock');
const { roundPaisa, multiplyPaisa } = require('../utils/safeAmount');
const logger = require('../utils/logger');

exports.pricingPreview = async (req, res) => {
  try {
    const { bikeId, startTime, endTime, couponCode } = req.body;
    if (!bikeId || !startTime || !endTime) {
      return res.status(400).json({ message: 'bikeId, startTime, and endTime are required', available: false });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time', available: false });
    }

    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    if (hours < 1) {
      return res.status(400).json({ message: 'Minimum rental duration is 1 hour', available: false });
    }

    const bike = await Bike.findById(bikeId).populate('category', 'name slug');
    if (!bike) return res.status(404).json({ message: 'Bike not found', available: false });

    const availability = await checkAvailability(bikeId, startTime, endTime, null, req.user?.id);

    const pricing = await calculateBookingPrice(bike.pricePerHour, startTime, endTime, bike.packages);

    let couponResult = null;
    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      const couponDoc = await Coupon.findOne({
        code,
        isActive: true,
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
          { $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        ],
      });

      if (couponDoc) {
        const discountedPrice = applyCoupon(pricing.totalPrice, couponDoc.discountPercent);
        const discountedAdvance = roundPaisa(multiplyPaisa(discountedPrice, pricing.advancePercent));
        couponResult = {
          code: couponDoc.code,
          discountPercent: couponDoc.discountPercent,
          discountedPrice,
          discountedAdvance,
        };
      }
    }

    res.json({
      available: availability.available,
      conflictMessage: availability.available ? null : availability.message,
      pricing: {
        totalPrice: couponResult ? couponResult.discountedPrice : pricing.totalPrice,
        minAdvance: couponResult ? couponResult.discountedAdvance : pricing.minAdvance,
        hours: pricing.hours,
        hourlyRate: pricing.hourlyRate,
        isShortRental: pricing.isShortRental,
        advancePercent: pricing.advancePercent,
        packageName: pricing.packageName,
        couponApplied: couponResult ? { code: couponResult.code, discount: couponResult.discountPercent } : null,
      },
    });
  } catch (error) {
    logger.error('preview error:', error.message);
    res.status(500).json({ message: 'Failed to calculate pricing', available: false });
  }
};
