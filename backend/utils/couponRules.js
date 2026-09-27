/**
 * Coupon rules.
 *
 * Deliberately pure so the rules are unit-testable without a database, and so
 * booking creation and payment confirmation cannot drift apart.
 *
 * UNITS: the rest of the money path stores taka, but the coupon model's
 * `*Paisa` fields (`discountFixedPaisa`, `maxDiscountPaisa`,
 * `minBookingAmountPaisa`) genuinely mean paisa — their names say so and the
 * retired CouponService divided by 100 before showing them to users. They are
 * converted to taka at this boundary and nowhere else.
 */

const PAISA_PER_TAKA = 100;

function paisaToTaka(paisa) {
  return Math.round(Number(paisa) || 0) / PAISA_PER_TAKA;
}

/**
 * Resolve the user id a `usedBy` entry belongs to.
 *
 * `usedBy` is `[{ user, usedAt, booking }]`, but three call sites used to write
 * a bare ObjectId (`$addToSet: { usedBy: booking.user }`). Both shapes show up in
 * live data, so reads must tolerate the legacy one until the migration runs.
 */
function entryUserId(entry) {
  if (!entry) return null;
  if (entry.user) return String(entry.user._id || entry.user);
  return String(entry._id || entry);
}

function userUsageCount(usedBy, userId) {
  if (!Array.isArray(usedBy) || !userId) return 0;
  const target = String(userId);
  return usedBy.filter(entry => entryUserId(entry) === target).length;
}

/**
 * Validate a coupon against a specific booking attempt.
 * @returns {{valid: boolean, message?: string}}
 */
function validateCouponForBooking({
  coupon, totalTaka, userId, bikeCategoryId, hasPriorBookings = false,
}) {
  const notUsable = { valid: false, message: 'Coupon is invalid, expired, or has reached its usage limit' };

  if (!coupon) return { valid: false, message: 'Coupon not found' };
  if (coupon.isActive === false) return notUsable;
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return notUsable;
  if (coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) return notUsable;

  const usedByThisUser = userUsageCount(coupon.usedBy, userId);
  if (coupon.maxUsesPerUser > 0 && usedByThisUser >= coupon.maxUsesPerUser) {
    return { valid: false, message: 'You have already used this coupon' };
  }

  if (coupon.firstTimeUserOnly && hasPriorBookings) {
    return { valid: false, message: 'This coupon is valid for first-time customers only' };
  }

  if (coupon.minBookingAmountPaisa && totalTaka < paisaToTaka(coupon.minBookingAmountPaisa)) {
    return {
      valid: false,
      message: `This coupon requires a minimum booking amount of ${paisaToTaka(coupon.minBookingAmountPaisa)} TK`,
    };
  }

  if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
    const allowed = coupon.applicableCategories.map(id => String(id._id || id));
    if (!bikeCategoryId || !allowed.includes(String(bikeCategoryId))) {
      return { valid: false, message: 'This coupon is not valid for this vehicle category' };
    }
  }

  return { valid: true };
}

/**
 * Apply a coupon to a total, honouring FIXED vs PERCENTAGE and the discount cap.
 * Never returns a negative total.
 *
 * @returns {{discountedTotal: number, discountTaka: number}}
 */
function applyCouponToTotal(totalTaka, coupon) {
  const total = Number(totalTaka) || 0;
  if (!coupon) return { discountedTotal: Math.round(total), discountTaka: 0 };

  let discount = coupon.discountType === 'FIXED'
    ? paisaToTaka(coupon.discountFixedPaisa)
    : total * (Number(coupon.discountPercent) || 0) / 100;

  if (coupon.maxDiscountPaisa) {
    discount = Math.min(discount, paisaToTaka(coupon.maxDiscountPaisa));
  }

  discount = Math.max(0, Math.min(discount, total));

  return {
    discountedTotal: Math.round(total - discount),
    discountTaka: Math.round(discount),
  };
}

/**
 * Accounting for one coupon redemption. Safe to call exactly once per booking —
 * payment confirmation guards it with an atomic status claim.
 */
function buildCouponConsumeUpdate({ userId, bookingId }) {
  return {
    $inc: { usedCount: 1 },
    $addToSet: { usedBy: { user: userId, booking: bookingId, usedAt: new Date() } },
  };
}

/**
 * Reverse a coupon redemption.
 *
 * Returns a guarded filter alongside the update: `usedCount` must be positive or
 * the write is skipped, which is how a decrement is clamped. Note there is no
 * `$min` here — pairing `$inc` and `$min` on the same path is a MongoDB write
 * error, and that conflict is what used to make cancelling a coupon-bearing
 * booking fail outright.
 */
function buildCouponReleaseUpdate({ userId }) {
  return {
    filter: { usedCount: { $gt: 0 } },
    update: {
      $inc: { usedCount: -1 },
      $pull: { usedBy: { user: userId } },
    },
  };
}

module.exports = {
  paisaToTaka,
  entryUserId,
  userUsageCount,
  validateCouponForBooking,
  applyCouponToTotal,
  buildCouponConsumeUpdate,
  buildCouponReleaseUpdate,
  PAISA_PER_TAKA,
};
