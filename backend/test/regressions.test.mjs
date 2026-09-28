import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const {
  userUsageCount,
  entryUserId,
  validateCouponForBooking,
  applyCouponToTotal,
  buildCouponConsumeUpdate,
  buildCouponReleaseUpdate,
} = require('../utils/couponRules');

const { buildOverlapFilter, ACTIVE_STATUSES } = require('../utils/bookingLock');
const { roundPaisa, roundTaka, multiplyTaka, subtractTaka } = require('../utils/safeAmount');
const { hashIdentifier, normalizeIdentifier } = require('../security/utils/piiHash');
const { sanitize, sanitizeEmail, escapeRegex } = require('../utils/sanitize');
const { campaignResumeOffset } = require('../jobs/emailCampaignSender');
const faqsRouter = require('../routes/faqs');

describe('coupon usedBy shape', () => {
  it('counts subdocument entries written by the current code', () => {
    const usedBy = [{ user: 'u1', booking: 'b1' }, { user: 'u2' }];
    expect(userUsageCount(usedBy, 'u1')).toBe(1);
    expect(userUsageCount(usedBy, 'u2')).toBe(1);
    expect(userUsageCount(usedBy, 'u3')).toBe(0);
  });

  it('still counts legacy bare-ObjectId entries', () => {
    // $addToSet: { usedBy: booking.user } put an id straight into the array.
    // Reading only `entry.user` made this 0, so maxUsesPerUser never blocked.
    const legacy = [{ _id: 'u1' }, 'u1'];
    expect(userUsageCount(legacy, 'u1')).toBe(2);
  });

  it('tolerates a populated user document', () => {
    expect(userUsageCount([{ user: { _id: 'u1', name: 'A' } }], 'u1')).toBe(1);
  });

  it('resolves entry user ids defensively', () => {
    expect(entryUserId(undefined)).toBeNull();
    expect(entryUserId({ user: 'u1' })).toBe('u1');
    expect(entryUserId('u2')).toBe('u2');
  });
});

describe('per-user coupon limit', () => {
  const baseCoupon = {
    code: 'SAVE10',
    isActive: true,
    discountType: 'PERCENTAGE',
    discountPercent: 10,
    maxUses: 0,
    maxUsesPerUser: 1,
    usedBy: [],
  };

  it('blocks a second use by the same user', () => {
    const coupon = { ...baseCoupon, usedBy: [{ user: 'u1' }] };
    const result = validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1' });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/already used/i);
  });

  it('blocks a legacy bare-id redemption too', () => {
    const coupon = { ...baseCoupon, usedBy: [{ _id: 'u1' }] };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1' }).valid).toBe(false);
  });

  it('allows a first use', () => {
    expect(validateCouponForBooking({ coupon: baseCoupon, totalTaka: 1000, userId: 'u1' }).valid).toBe(true);
  });

  it('rejects an exhausted global limit', () => {
    const coupon = { ...baseCoupon, maxUses: 5, usedCount: 5 };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u9' }).valid).toBe(false);
  });

  it('rejects an expired coupon', () => {
    const coupon = { ...baseCoupon, expiresAt: new Date(Date.now() - 86400000) };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u9' }).valid).toBe(false);
  });
});

describe('coupon constraints that used to be ignored', () => {
  const base = { code: 'X', isActive: true, maxUses: 0, maxUsesPerUser: 1, usedBy: [] };

  it('enforces firstTimeUserOnly', () => {
    const coupon = { ...base, firstTimeUserOnly: true, discountPercent: 10 };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1', hasPriorBookings: true }).valid).toBe(false);
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1', hasPriorBookings: false }).valid).toBe(true);
  });

  it('enforces minBookingAmountPaisa (paisa -> taka boundary)', () => {
    const coupon = { ...base, discountPercent: 10, minBookingAmountPaisa: 200000 }; // 2000 TK
    expect(validateCouponForBooking({ coupon, totalTaka: 1500, userId: 'u1' }).valid).toBe(false);
    expect(validateCouponForBooking({ coupon, totalTaka: 2500, userId: 'u1' }).valid).toBe(true);
  });

  it('enforces applicableCategories', () => {
    const coupon = { ...base, discountPercent: 10, applicableCategories: ['cat-bike'] };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1', bikeCategoryId: 'cat-jeep' }).valid).toBe(false);
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1', bikeCategoryId: 'cat-bike' }).valid).toBe(true);
  });

  it('allows any category when none is restricted', () => {
    const coupon = { ...base, discountPercent: 10, applicableCategories: [] };
    expect(validateCouponForBooking({ coupon, totalTaka: 1000, userId: 'u1', bikeCategoryId: 'cat-jeep' }).valid).toBe(true);
  });
});

describe('coupon discount application', () => {
  it('applies a percentage coupon', () => {
    const { discountedTotal, discountTaka } = applyCouponToTotal(1000, { discountType: 'PERCENTAGE', discountPercent: 10 });
    expect(discountedTotal).toBe(900);
    expect(discountTaka).toBe(100);
  });

  it('applies a FIXED coupon as taka, not as a percentage', () => {
    // discountFixedPaisa is paisa: 50000 paisa == 500 TK off.
    const { discountedTotal, discountTaka } = applyCouponToTotal(2000, { discountType: 'FIXED', discountFixedPaisa: 50000 });
    expect(discountTaka).toBe(500);
    expect(discountedTotal).toBe(1500);
  });

  it('caps a percentage discount at maxDiscountPaisa', () => {
    const { discountTaka, discountedTotal } = applyCouponToTotal(10000, {
      discountType: 'PERCENTAGE',
      discountPercent: 50,
      maxDiscountPaisa: 100000, // 1000 TK cap
    });
    expect(discountTaka).toBe(1000);
    expect(discountedTotal).toBe(9000);
  });

  it('never discounts more than the total', () => {
    const { discountedTotal, discountTaka } = applyCouponToTotal(300, { discountType: 'FIXED', discountFixedPaisa: 100000 });
    expect(discountTaka).toBe(300);
    expect(discountedTotal).toBe(0);
  });

  it('is a no-op without a coupon', () => {
    expect(applyCouponToTotal(750, null).discountedTotal).toBe(750);
  });
});

describe('coupon usage accounting', () => {
  it('records usage as a subdocument, not a bare id', () => {
    const update = buildCouponConsumeUpdate({ userId: 'u1', bookingId: 'b1' });
    expect(update.$inc.usedCount).toBe(1);
    expect(update.$addToSet.usedBy.user).toBe('u1');
    expect(update.$addToSet.usedBy.booking).toBe('b1');
    expect(update.$addToSet.usedBy.usedAt).toBeInstanceOf(Date);
  });

  it('releases usage without a conflicting $min on usedCount', () => {
    const { filter, update } = buildCouponReleaseUpdate({ userId: 'u1' });

    // $inc + $min on one path is a MongoDB write error, and it was inside a
    // transaction — so cancelling a coupon-bearing booking failed with a 500.
    expect(update.$inc.usedCount).toBe(-1);
    expect(update.$min).toBeUndefined();

    // The decrement is clamped by the filter instead.
    expect(filter.usedCount.$gt).toBe(0);
  });

  it('applies no two operators to the same path', () => {
    const { update } = buildCouponReleaseUpdate({ userId: 'u1' });
    const paths = Object.values(update).flatMap(op => Object.keys(op));
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('booking window overlap filter', () => {
  const start = new Date('2026-09-01T04:00:00Z');
  const end = new Date('2026-09-01T08:00:00Z');
  const BUFFER_MS = 30 * 60 * 1000;

  it('expands the requested window by the buffer on both sides', () => {
    const filter = buildOverlapFilter('bike1', start, end);
    expect(filter.startTime.$lt.getTime()).toBe(end.getTime() + BUFFER_MS);
    expect(filter.endTime.$gt.getTime()).toBe(start.getTime() - BUFFER_MS);
  });

  it('counts Pending and Confirmed bookings as occupying the window', () => {
    expect(buildOverlapFilter('bike1', start, end).status.$in).toEqual(ACTIVE_STATUSES);
    expect(ACTIVE_STATUSES).toContain('Pending');
    expect(ACTIVE_STATUSES).toContain('Confirmed');
  });

  it('ignores the requesting user&apos;s own pending checkouts', () => {
    const filter = buildOverlapFilter('bike1', start, end, { excludeUserId: 'u1' });
    expect(filter.status).toBeUndefined();
    expect(filter.$or).toEqual([
      { status: 'Confirmed' },
      { $and: [{ status: 'Pending' }, { user: { $ne: 'u1' } }] },
    ]);
  });

  it('excludes a specific booking when checking an extension', () => {
    const filter = buildOverlapFilter('bike1', start, end, { excludeBookingId: 'b9' });
    expect(filter._id.$ne).toBe('b9');
  });

  it('scopes every filter to the bike', () => {
    expect(buildOverlapFilter('bike1', start, end).bike).toBe('bike1');
  });
});

describe('money helpers', () => {
  it('exposes the taka-named helpers as the same implementation', () => {
    expect(roundPaisa(10.6)).toBe(roundTaka(10.6));
    expect(roundPaisa(10.6)).toBe(11);
  });

  it('does not scale by 100 anywhere', () => {
    // Guards the trap that made discountFixedPaisa behave as a percentage.
    expect(multiplyTaka(100, 0.5)).toBe(50);
    expect(subtractTaka(1000, 250)).toBe(750);
  });
});

describe('PII identifier hashing', () => {
  it('refuses to hash without a pepper', () => {
    expect(hashIdentifier('1234567890', null)).toBeNull();
  });

  it('is stable for the same value and pepper', () => {
    const a = hashIdentifier('1234567890', 'pepper');
    const b = hashIdentifier('1234567890', 'pepper');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when the pepper changes, so a leaked digest is not reusable', () => {
    expect(hashIdentifier('1234567890', 'pepper-a')).not.toBe(hashIdentifier('1234567890', 'pepper-b'));
  });

  it('normalises spacing so formatting cannot create a duplicate account', () => {
    expect(normalizeIdentifier(' 0176 4466757 ')).toBe('01764466757');
    expect(hashIdentifier('0176 4466757', 'p')).toBe(hashIdentifier('01764466757', 'p'));
  });

  it('returns null for empty input so the sparse index stays sparse', () => {
    expect(hashIdentifier('', 'pepper')).toBeNull();
    expect(hashIdentifier('   ', 'pepper')).toBeNull();
  });
});

describe('regex escaping for user-supplied search input', () => {
  it('neutralises regex metacharacters', () => {
    expect(escapeRegex('(a+)+$')).toBe('\\(a\\+\\)\\+\\$');
    expect(escapeRegex('.*')).toBe('\\.\\*');
    expect(escapeRegex('bike[1]')).toBe('bike\\[1\\]');
  });

  it('cannot be turned into a catastrophic-backtracking pattern', () => {
    const compiled = new RegExp(escapeRegex('(a+)+$'), 'i');
    expect(compiled.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
    expect(compiled.test('(a+)+$')).toBe(true);
  });

  it('tolerates non-string query values', () => {
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex({ $ne: 'x' })).toBe('\\[object Object\\]');
  });
});

describe('email HTML sanitizing', () => {
  const body = '<h2>Booking Confirmed!</h2><p>Hi <strong>Rakib</strong></p>';

  it('keeps the markup an admin authored in a template', () => {
    // The tag-stripping text sanitizer erased this on save, so every themed email
    // silently degraded to bare, unformatted text.
    const clean = sanitizeEmail(body);
    expect(clean).toContain('<h2>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('Booking Confirmed!');
  });

  it('still strips scripts, event handlers and javascript: URLs', () => {
    const hostile = '<p onclick="steal()">Hi</p><script>steal()</script><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeEmail(hostile);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it('did not loosen the tag-stripping sanitizer used for user text', () => {
    expect(sanitize('<b>there</b>')).not.toMatch(/</);
    expect(sanitize('<script>alert(1)</script>Hi')).not.toMatch(/<script/i);
  });
});

describe('campaign pagination offset', () => {
  it('counts recipients attempted, not recipients that succeeded', () => {
    // 47 sent + 3 failed must advance the offset to 50. Paging on `sent` alone left
    // it at 47, so the next batch re-fetched those three and emailed them again.
    expect(campaignResumeOffset({ sent: 47, failed: 3 })).toBe(50);
  });

  it('does not double-count bounces, which are already counted as failures', () => {
    expect(campaignResumeOffset({ sent: 10, failed: 5, bounced: 5 })).toBe(15);
  });

  it('starts at zero for a fresh campaign', () => {
    expect(campaignResumeOffset(undefined)).toBe(0);
    expect(campaignResumeOffset({})).toBe(0);
  });
});

describe('admin route ordering', () => {
  it('declares /admin/faqs/reorder before /admin/faqs/:id', () => {
    // Express matches in declaration order, so with `:id` first a PUT to
    // /admin/faqs/reorder had its path captured as an id, threw a CastError, and the
    // reorder endpoint could never be reached.
    const putPaths = faqsRouter.stack
      .filter(layer => layer.route && layer.route.methods.put)
      .map(layer => layer.route.path);

    expect(putPaths).toContain('/admin/faqs/reorder');
    expect(putPaths.indexOf('/admin/faqs/reorder')).toBeLessThan(putPaths.indexOf('/admin/faqs/:id'));
  });
});
