import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mongoSanitize = require('../middleware/sanitize');

describe('sanitize middleware', () => {
  it('removes $ prefixed keys from body', () => {
    const middleware = mongoSanitize();
    const req = {
      body: { $gt: 'hacked', name: 'safe' },
      query: {},
      params: {},
    };
    middleware(req, {}, () => {});
    expect(req.body).toEqual({ name: 'safe' });
    expect(req.body.$gt).toBeUndefined();
  });

  it('preserves normal nested objects', () => {
    const middleware = mongoSanitize();
    const req = {
      body: { user: { name: 'John', age: 30 }, tags: ['admin', 'user'] },
      query: {},
      params: {},
    };
    middleware(req, {}, () => {});
    expect(req.body.user.name).toBe('John');
    expect(req.body.user.age).toBe(30);
    expect(req.body.tags).toEqual(['admin', 'user']);
  });

  it('removes $ from nested objects', () => {
    const middleware = mongoSanitize();
    const req = {
      body: { user: { $where: 'malicious', name: 'safe' } },
      query: {},
      params: {},
    };
    middleware(req, {}, () => {});
    expect(req.body.user.$where).toBeUndefined();
    expect(req.body.user.name).toBe('safe');
  });

  it('cleans query params', () => {
    const middleware = mongoSanitize();
    const req = {
      body: {},
      query: { $or: [{ hacked: true }], page: 1 },
      params: {},
    };
    middleware(req, {}, () => {});
    expect(req.query.$or).toBeUndefined();
    expect(req.query.page).toBe(1);
  });

  it('handles null/undefined gracefully', () => {
    const middleware = mongoSanitize();
    const req = {
      body: null,
      query: undefined,
      params: {},
    };
    expect(() => middleware(req, {}, () => {})).not.toThrow();
  });

  it('handles arrays', () => {
    const middleware = mongoSanitize();
    const req = {
      body: { items: [{ $gt: 1 }, { $lt: 5 }] },
      query: {},
      params: {},
    };
    middleware(req, {}, () => {});
    expect(req.body.items[0]).toEqual({});
    expect(req.body.items[1]).toEqual({});
  });

  it('calls next()', () => {
    const middleware = mongoSanitize();
    const next = vi.fn();
    middleware({ body: {}, query: {}, params: {} }, {}, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
