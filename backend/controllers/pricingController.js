const Bike = require('../models/Bike');
const Coupon = require('../models/Coupon');
const { calculateBookingPrice } = require('../utils/pricing');
const { validateCouponForBooking, applyCouponToTotal } = require('../utils/couponRules');
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

    // The preview must agree with what createBooking will actually charge, so it
    // runs the same shared rules — including FIXED coupons and the discount cap.
    let couponResult = null;
    let couponError = null;
    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      const couponDoc = await Coupon.findOne({ code });
      const priorBookings = await require('../models/Booking')
        .countDocuments({ user: req.user.id, status: { $ne: 'Cancelled' } });

      const check = validateCouponForBooking({
        coupon: couponDoc,
        totalTaka: pricing.totalPrice,
        userId: req.user.id,
        bikeCategoryId: bike.category?._id || bike.category,
        hasPriorBookings: priorBookings > 0,
      });

      if (check.valid) {
        const { discountedTotal, discountTaka } = applyCouponToTotal(pricing.totalPrice, couponDoc);
        couponResult = {
          code: couponDoc.code,
          discountPercent: couponDoc.discountPercent,
          discountTaka,
          discountedPrice: discountedTotal,
          discountedAdvance: roundPaisa(multiplyPaisa(discountedTotal, pricing.advancePercent)),
        };
      } else {
        couponError = check.message;
      }
    }

    res.json({
      available: availability.available,
      conflictMessage: availability.available ? null : availability.message,
      couponError,
      pricing: {
        totalPrice: couponResult ? couponResult.discountedPrice : pricing.totalPrice,
        minAdvance: couponResult ? couponResult.discountedAdvance : pricing.minAdvance,
        hours: pricing.hours,
        hourlyRate: pricing.hourlyRate,
        isShortRental: pricing.isShortRental,
        advancePercent: pricing.advancePercent,
        packageName: pricing.packageName,
        discountTaka: couponResult ? couponResult.discountTaka : 0,
        couponApplied: couponResult ? { code: couponResult.code, discount: couponResult.discountPercent } : null,
      },
    });
  } catch (error) {
    logger.error('preview error:', error.message);
    res.status(500).json({ message: 'Failed to calculate pricing', available: false });
  }
};
