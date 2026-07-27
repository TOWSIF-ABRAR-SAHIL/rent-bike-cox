import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../models/CircuitBreaker.js', () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((doc) => Promise.resolve({ ...doc, save: vi.fn() })),
    findOneAndUpdate: vi.fn().mockResolvedValue({
      totalRefunded: 0,
      dailyRefundCap: 50000,
      isTripped: false,
      save: vi.fn(),
    }),
  },
}));

vi.mock('../utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { calculateRefund } from '../utils/refund.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('calculateRefund', () => {
  it('100% refund when cancelled >24h before pickup', async () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const booking = {
      startTime: '2024-01-03T00:00:00Z',
      endTime: '2024-01-04T00:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(100);
    expect(result.refundableAmount).toBe(1000);
    expect(result.penaltyReason).toContain('Full refund');
    expect(result.hoursUntilPickup).toBe(48);
  });

  it('50% refund when cancelled 12-24h before pickup', async () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const booking = {
      startTime: '2024-01-01T18:00:00Z',
      endTime: '2024-01-02T18:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(50);
    expect(result.refundableAmount).toBe(500);
    expect(result.penaltyReason).toContain('50% refund');
    expect(result.hoursUntilPickup).toBe(18);
  });

  it('0% refund when cancelled <12h before pickup', async () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const booking = {
      startTime: '2024-01-01T06:00:00Z',
      endTime: '2024-01-02T06:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(0);
    expect(result.refundableAmount).toBe(0);
    expect(result.penaltyReason).toContain('less than 12 hours');
    expect(result.hoursUntilPickup).toBe(6);
  });

  it('0% refund when past start time and rental ended', async () => {
    vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));
    const booking = {
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-02T00:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(0);
    expect(result.refundableAmount).toBe(0);
    expect(result.penaltyReason).toContain('rental period has ended');
  });

  it('past start, in-progress falls to no-show due to dividePaisa rounding', async () => {
    vi.setSystemTime(new Date('2024-01-01T06:00:00Z'));
    const booking = {
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-02T00:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(0);
    expect(result.refundableAmount).toBe(0);
    expect(result.penaltyReason).toContain('no-show');
  });

  it('handles zero advancePaid', async () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const booking = {
      startTime: '2024-01-03T00:00:00Z',
      endTime: '2024-01-04T00:00:00Z',
      advancePaid: 0,
    };
    const result = await calculateRefund(booking);
    expect(result.refundPercent).toBe(100);
    expect(result.refundableAmount).toBe(0);
  });

  it('returns hoursUntilPickup floored to 0 for past times', async () => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    const booking = {
      startTime: '2024-01-01T06:00:00Z',
      endTime: '2024-01-02T06:00:00Z',
      advancePaid: 1000,
    };
    const result = await calculateRefund(booking);
    expect(result.hoursUntilPickup).toBe(0);
  });
});
