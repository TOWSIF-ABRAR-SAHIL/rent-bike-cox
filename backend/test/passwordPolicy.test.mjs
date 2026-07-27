import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { checkPasswordStrength, isPasswordReused } = require('../security/utils/passwordPolicy');

describe('checkPasswordStrength', () => {
  it('rejects null input', () => {
    const result = checkPasswordStrength(null);
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errors).toContain('Password is required');
  });

  it('rejects undefined input', () => {
    const result = checkPasswordStrength(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  it('rejects empty string', () => {
    const result = checkPasswordStrength('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  it('rejects non-string input', () => {
    const result = checkPasswordStrength(12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  it('rejects password shorter than 8 characters', () => {
    const result = checkPasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('rejects password longer than 128 characters', () => {
    const long = 'A'.repeat(122) + 'b1!xxxx';
    expect(long.length).toBe(129);
    const result = checkPasswordStrength(long);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must not exceed 128 characters');
  });

  it('accepts exactly 128 character password', () => {
    const pw = 'A'.repeat(121) + 'b1!xxxx';
    expect(pw.length).toBe(128);
    const result = checkPasswordStrength(pw);
    expect(result.errors).not.toContain('Password must not exceed 128 characters');
  });

  it('rejects password without lowercase', () => {
    const result = checkPasswordStrength('ABCDEF1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('rejects password without uppercase', () => {
    const result = checkPasswordStrength('abcdef1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('rejects password without digit', () => {
    const result = checkPasswordStrength('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('rejects password without special character', () => {
    const result = checkPasswordStrength('Abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*...)');
  });

  it('penalizes common passwords (-3 score)', () => {
    const result = checkPasswordStrength('password123');
    expect(result.errors).toContain('Password is too common. Choose a more unique password');
    expect(result.score).toBeLessThan(5);
  });

  it('penalizes repeated characters', () => {
    const result = checkPasswordStrength('aaaAAAA11!!');
    expect(result.valid).toBe(true);
    expect(result.score).toBeLessThan(5);
  });

  it('penalizes sequential numbers', () => {
    const result = checkPasswordStrength('123abcdef');
    expect(result.score).toBeLessThan(5);
  });

  it('penalizes letter-then-digit pattern', () => {
    const result = checkPasswordStrength('abcdefgh1');
    expect(result.score).toBeLessThan(5);
  });

  it('returns score 5 for a strong password', () => {
    const result = checkPasswordStrength('MyStr0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.score).toBe(5);
    expect(result.strength).toBe('very-strong');
    expect(result.errors).toHaveLength(0);
  });

  it('classifies weak/fair/strong/very-strong', () => {
    expect(checkPasswordStrength('MyStr0ng!Pass').strength).toBe('very-strong');
    const short = checkPasswordStrength('Ab1!xxxx');
    expect(['weak', 'fair', 'strong']).toContain(short.strength);
  });
});

describe('isPasswordReused', () => {
  const bcrypt = require('bcryptjs');

  it('returns false if password history is null', () => {
    expect(isPasswordReused('test', null)).toBe(false);
  });

  it('returns false if password history is not an array', () => {
    expect(isPasswordReused('test', 'not-an-array')).toBe(false);
  });

  it('returns false when password is not in history', () => {
    const hash = bcrypt.hashSync('oldPassword', 10);
    expect(isPasswordReused('newPassword', [hash])).toBe(false);
  });

  it('returns true when password matches a hash in history', () => {
    const hash = bcrypt.hashSync('myPassword', 10);
    expect(isPasswordReused('myPassword', [hash])).toBe(true);
  });

  it('checks against multiple history entries', () => {
    const h1 = bcrypt.hashSync('pass1', 10);
    const h2 = bcrypt.hashSync('pass2', 10);
    const h3 = bcrypt.hashSync('pass3', 10);
    expect(isPasswordReused('pass2', [h1, h2, h3])).toBe(true);
    expect(isPasswordReused('pass4', [h1, h2, h3])).toBe(false);
  });
});
