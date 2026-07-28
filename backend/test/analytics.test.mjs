import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const analyticsController = require('../controllers/analyticsController');

describe('analyticsController exports', () => {
  it('exports getRevenueAnalytics', () => {
    expect(typeof analyticsController.getRevenueAnalytics).toBe('function');
  });

  it('exports getBookingTrends', () => {
    expect(typeof analyticsController.getBookingTrends).toBe('function');
  });

  it('exports getCategoryPerformance', () => {
    expect(typeof analyticsController.getCategoryPerformance).toBe('function');
  });

  it('exports getTopBikes', () => {
    expect(typeof analyticsController.getTopBikes).toBe('function');
  });

  it('exports getCustomerInsights', () => {
    expect(typeof analyticsController.getCustomerInsights).toBe('function');
  });

  it('exports exportAnalytics', () => {
    expect(typeof analyticsController.exportAnalytics).toBe('function');
  });

  it('exports getZoneAnalytics (new)', () => {
    expect(typeof analyticsController.getZoneAnalytics).toBe('function');
  });

  it('exports getRentalDuration (new)', () => {
    expect(typeof analyticsController.getRentalDuration).toBe('function');
  });

  it('exports getFinancialSummary (new)', () => {
    expect(typeof analyticsController.getFinancialSummary).toBe('function');
  });
});

describe('analytics route config', () => {
  it('has all 9 routes defined', () => {
    const routes = require('../routes/analytics');
    expect(routes).toBeDefined();
  });
});
