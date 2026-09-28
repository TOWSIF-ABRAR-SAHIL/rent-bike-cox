import { describe, it, expect } from 'vitest';
import { maskIp } from './maskIp';

describe('maskIp', () => {
  it('keeps two IPv4 octets', () => {
    expect(maskIp('103.86.88.12')).toBe('103.86.•.•');
  });

  it('truncates IPv6', () => {
    expect(maskIp('2001:db8:abcd:0012:0000:0000:0000:0001')).toBe('2001:db8:abcd:•');
  });

  it('never returns the full address for odd input', () => {
    expect(maskIp('localhost')).toBe('•');
    expect(maskIp(undefined)).toBe('—');
    expect(maskIp('')).toBe('—');
  });
});
