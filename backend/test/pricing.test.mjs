import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  calculateHours,
  isShortRental,
  getAdvancePercent,
  findMatchingTier,
  applyCoupon,
  MIN_HOURLY_RATE,
  BUFFER_MINUTES,
} = require('../utils/pricing');

describe('pricing utilities', () => {
  describe('calculateHours', () => {
    it('calculates 1 hour', () => {
      const start = new Date('2026-07-28T10:00:00Z');
      const end = new Date('2026-07-28T11:00:00Z');
      expect(calculateHours(start, end)).toBe(1);
    });

    it('calculates 3 hours', () => {
      const start = new Date('2026-07-28T10:00:00Z');
      const end = new Date('2026-07-28T13:00:00Z');
      expect(calculateHours(start, end)).toBe(3);
    });

    it('rounds up partial hours', () => {
      const start = new Date('2026-07-28T10:00:00Z');
      const end = new Date('2026-07-28T12:30:00Z');
      expect(calculateHours(start, end)).toBe(3);
    });

    it('calculates 25 hours (long rental)', () => {
      const start = new Date('2026-07-28T10:00:00Z');
      const end = new Date('2026-07-29T11:00:00Z');
      expect(calculateHours(start, end)).toBe(25);
    });
  });

  describe('isShortRental', () => {
    it('returns true for <=24h', () => {
      expect(isShortRental(1)).toBe(true);
      expect(isShortRental(24)).toBe(true);
    });

    it('returns false for >24h', () => {
      expect(isShortRental(25)).toBe(false);
      expect(isShortRental(48)).toBe(false);
    });
  });

  describe('getAdvancePercent', () => {
    it('returns 50% for short rentals', () => {
      expect(getAdvancePercent(1)).toBe(0.5);
      expect(getAdvancePercent(24)).toBe(0.5);
    });

    it('returns 30% for long rentals', () => {
      expect(getAdvancePercent(25)).toBe(0.3);
      expect(getAdvancePercent(48)).toBe(0.3);
    });
  });

  describe('findMatchingTier', () => {
    const tiers = [
      { label: '1-2 Hours', minHours: 1, maxHours: 2, hourlyRate: 200 },
      { label: '3-4 Hours', minHours: 3, maxHours: 4, hourlyRate: 180 },
      { label: '5+ Hours', minHours: 5, maxHours: null, hourlyRate: 150 },
    ];

    it('matches 1-2h tier', () => {
      expect(findMatchingTier(1, tiers).label).toBe('1-2 Hours');
      expect(findMatchingTier(2, tiers).label).toBe('1-2 Hours');
    });

    it('matches 3-4h tier', () => {
      expect(findMatchingTier(3, tiers).label).toBe('3-4 Hours');
      expect(findMatchingTier(4, tiers).label).toBe('3-4 Hours');
    });

    it('matches 5+ tier', () => {
      expect(findMatchingTier(5, tiers).label).toBe('5+ Hours');
      expect(findMatchingTier(10, tiers).label).toBe('5+ Hours');
    });

    it('returns null for no tiers', () => {
      expect(findMatchingTier(5, null)).toBeNull();
      expect(findMatchingTier(5, [])).toBeNull();
    });

    it('selects cheapest matching tier', () => {
      const overlapping = [
        { label: 'Expensive', minHours: 1, maxHours: 10, hourlyRate: 300 },
        { label: 'Cheap', minHours: 1, maxHours: 10, hourlyRate: 100 },
      ];
      expect(findMatchingTier(5, overlapping).label).toBe('Cheap');
    });
  });

  describe('applyCoupon', () => {
    it('applies 10% discount', () => {
      expect(applyCoupon(1000, 10)).toBe(900);
    });

    it('applies 50% discount', () => {
      expect(applyCoupon(1000, 50)).toBe(500);
    });

    it('applies 0% discount', () => {
      expect(applyCoupon(1000, 0)).toBe(1000);
    });
  });

  describe('constants', () => {
    it('MIN_HOURLY_RATE is 150', () => {
      expect(MIN_HOURLY_RATE).toBe(150);
    });

    it('BUFFER_MINUTES is 30', () => {
      expect(BUFFER_MINUTES).toBe(30);
    });
  });
});
