process.env.JWT_SECRET = 'test-secret-key';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-key';
});

vi.mock('../security/config/securityConfig.js', () => ({
  default: {
    jwt: {
      accessExpiresIn: '1h',
      refreshExpiresIn: '7d',
      algorithm: 'HS256',
      issuer: 'rent-bike-cox',
    },
  },
}));

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeTokenUnsafe,
  buildFingerprint,
} = require('../security/utils/tokenManager');

const fakeUser = { _id: 'user123', role: 'Admin', name: 'Test User', email: 'test@example.com' };

describe('generateAccessToken', () => {
  it('returns a JWT string', () => {
    const token = generateAccessToken(fakeUser, 'fingerprint1');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('decoded payload has correct fields', () => {
    const token = generateAccessToken(fakeUser, 'fingerprint1');
    const decoded = decodeTokenUnsafe(token);
    expect(decoded.id).toBe('user123');
    expect(decoded.role).toBe('Admin');
    expect(decoded.type).toBe('access');
    expect(decoded.name).toBe('Test User');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.fp).toBe('fingerprint1');
  });

  it('omits name, email, fp when not provided', () => {
    const minimalUser = { _id: 'u1', role: 'User' };
    const token = generateAccessToken(minimalUser, undefined);
    const decoded = decodeTokenUnsafe(token);
    expect(decoded.name).toBeUndefined();
    expect(decoded.email).toBeUndefined();
    expect(decoded.fp).toBeUndefined();
  });
});

describe('generateRefreshToken', () => {
  it('returns a JWT string', () => {
    const token = generateRefreshToken(fakeUser, 'family-abc');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('decoded payload has correct fields', () => {
    const token = generateRefreshToken(fakeUser, 'family-abc');
    const decoded = decodeTokenUnsafe(token);
    expect(decoded.id).toBe('user123');
    expect(decoded.role).toBe('Admin');
    expect(decoded.type).toBe('refresh');
    expect(decoded.family).toBe('family-abc');
    expect(decoded.jti).toBeDefined();
  });

  it('generates a random familyId when none provided', () => {
    const token = generateRefreshToken(fakeUser);
    const decoded = decodeTokenUnsafe(token);
    expect(decoded.family).toBeDefined();
    expect(decoded.family.length).toBeGreaterThan(0);
  });
});

describe('verifyToken', () => {
  it('verifies a valid access token', () => {
    const token = generateAccessToken(fakeUser, 'fp1');
    const decoded = verifyToken(token, 'access');
    expect(decoded.id).toBe('user123');
    expect(decoded.type).toBe('access');
  });

  it('verifies a valid refresh token', () => {
    const token = generateRefreshToken(fakeUser, 'fam1');
    const decoded = verifyToken(token, 'refresh');
    expect(decoded.type).toBe('refresh');
  });

  it('throws on wrong token type', () => {
    const token = generateAccessToken(fakeUser, 'fp1');
    expect(() => verifyToken(token, 'refresh')).toThrow('Invalid token type');
  });

  it('throws on invalid token', () => {
    expect(() => verifyToken('garbage.token.here', 'access')).toThrow();
  });

  it('defaults to access type', () => {
    const token = generateAccessToken(fakeUser, 'fp1');
    const decoded = verifyToken(token);
    expect(decoded.type).toBe('access');
  });
});

describe('decodeTokenUnsafe', () => {
  it('returns decoded payload', () => {
    const token = generateAccessToken(fakeUser, 'fp1');
    const decoded = decodeTokenUnsafe(token);
    expect(decoded.id).toBe('user123');
    expect(decoded.role).toBe('Admin');
  });

  it('returns null for non-JWT string', () => {
    expect(decodeTokenUnsafe('not-a-jwt')).toBeNull();
  });
});

describe('buildFingerprint', () => {
  it('returns a 16-char hex string', () => {
    const fp = buildFingerprint({
      headers: { 'user-agent': 'Mozilla/5.0' },
      ip: '127.0.0.1',
    });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces consistent output for same input', () => {
    const req = { headers: { 'user-agent': 'TestAgent' }, ip: '10.0.0.1' };
    expect(buildFingerprint(req)).toBe(buildFingerprint(req));
  });

  it('produces different output for different input', () => {
    const fp1 = buildFingerprint({ headers: { 'user-agent': 'A' }, ip: '1.1.1.1' });
    const fp2 = buildFingerprint({ headers: { 'user-agent': 'B' }, ip: '2.2.2.2' });
    expect(fp1).not.toBe(fp2);
  });

  it('handles missing user-agent and ip', () => {
    const fp = buildFingerprint({ headers: {}, ip: undefined });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});
