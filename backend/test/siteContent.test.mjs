import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const SiteContent = require('../models/SiteContent');
const { sanitize } = require('../utils/sanitize');

describe('SiteContent model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new SiteContent({});
      await doc.validate();
      expect.fail('Should have thrown validation error');
    } catch (err) {
      expect(err.errors.key).toBeDefined();
    }
  });

  it('validates type enum', async () => {
    try {
      const doc = new SiteContent({ key: 'test.key', value: 'test', type: 'invalid', page: 'home' });
      await doc.validate();
      expect.fail('Should have thrown validation error');
    } catch (err) {
      expect(err.errors.type).toBeDefined();
    }
  });

  it('validates type enum accepts valid values', async () => {
    for (const t of ['text', 'html', 'number', 'image', 'json']) {
      const doc = new SiteContent({ key: `test.${t}`, value: 'x', type: t, page: 'home' });
      await doc.validate();
      expect(doc.type).toBe(t);
    }
  });

  it('defaults type to text', () => {
    const doc = new SiteContent({ key: 'test.default', value: 'v', page: 'p' });
    expect(doc.type).toBe('text');
  });

  it('defaults history to empty array', () => {
    const doc = new SiteContent({ key: 'test.hist', value: 'v', page: 'p' });
    expect(doc.history).toEqual([]);
  });

  it('limits history to 10 entries', async () => {
    const doc = new SiteContent({
      key: 'test.limit',
      value: 'v',
      page: 'p',
      history: Array.from({ length: 11 }, (_, i) => ({ value: `old${i}`, at: new Date() }))
    });
    try {
      await doc.validate();
      expect.fail('Should have thrown validation error');
    } catch (err) {
      expect(err.message).toContain('10');
    }
  });
});

describe('sanitize utility', () => {
  it('removes script tags', () => {
    const result = sanitize('<script>alert("xss")</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  it('preserves safe HTML', () => {
    const result = sanitize('Hello World');
    expect(result).toBe('Hello World');
  });

  it('handles empty input', () => {
    expect(sanitize('')).toBe('');
  });
});

describe('SiteContent JSON type', () => {
  it('accepts valid JSON string value', async () => {
    const jsonVal = JSON.stringify([{ title: 'Test', desc: 'desc' }]);
    const doc = new SiteContent({ key: 'test.json', value: jsonVal, type: 'json', page: 'home' });
    await doc.validate();
    expect(doc.value).toBe(jsonVal);
  });
});
