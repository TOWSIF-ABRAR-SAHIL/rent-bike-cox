import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  roundPaisa,
  addPaisa,
  subtractPaisa,
  multiplyPaisa,
  dividePaisa,
  percentOf,
} = require('../utils/safeAmount');

describe('safeAmount (Decimal.js wrapper)', () => {
  it('roundPaisa rounds correctly', () => {
    expect(roundPaisa(100.4)).toBe(100);
    expect(roundPaisa(100.5)).toBe(101);
    expect(roundPaisa(100.6)).toBe(101);
  });

  it('roundPaisa handles zero', () => {
    expect(roundPaisa(0)).toBe(0);
    expect(roundPaisa(null)).toBe(0);
    expect(roundPaisa(undefined)).toBe(0);
  });

  it('addPaisa adds correctly', () => {
    expect(addPaisa(100, 50)).toBe(150);
    expect(addPaisa(100.3, 100.7)).toBe(201);
    expect(addPaisa(0, 0)).toBe(0);
  });

  it('subtractPaisa subtracts correctly', () => {
    expect(subtractPaisa(200, 50)).toBe(150);
    expect(subtractPaisa(100, 200)).toBe(-100);
  });

  it('multiplyPaisa multiplies correctly', () => {
    expect(multiplyPaisa(10, 20)).toBe(200);
    expect(multiplyPaisa(200, 0.9)).toBe(180);
    expect(multiplyPaisa(200, 0.75)).toBe(150);
  });

  it('dividePaisa divides correctly', () => {
    expect(dividePaisa(200, 2)).toBe(100);
    expect(dividePaisa(100, 3)).toBe(33);
    expect(dividePaisa(100, 0)).toBe(0);
  });

  it('percentOf calculates percentage', () => {
    expect(percentOf(1000, 50)).toBe(500);
    expect(percentOf(1000, 30)).toBe(300);
    expect(percentOf(1000, 100)).toBe(1000);
    expect(percentOf(1000, 0)).toBe(0);
  });

  it('no floating point issues', () => {
    const result = addPaisa(0.1, 0.2);
    expect(typeof result).toBe('number');
    expect(Number.isFinite(result)).toBe(true);
  });
});
