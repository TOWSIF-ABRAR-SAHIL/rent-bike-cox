import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const authorize = require('../security/middleware/authorize');

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

describe('authorize middleware', () => {
  it('returns a function', () => {
    expect(typeof authorize('Admin')).toBe('function');
  });

  it('returns 401 when req.user is missing', () => {
    const middleware = authorize('Admin');
    const req = {};
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user.role is missing', () => {
    const middleware = authorize('Admin');
    const req = { user: {} };
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role does not match', () => {
    const middleware = authorize('Admin');
    const req = { user: { role: 'User' } };
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access denied');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when role matches', () => {
    const middleware = authorize('Admin');
    const req = { user: { role: 'Admin' } };
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('allows multiple roles', () => {
    const middleware = authorize('Admin', 'Renter');
    const next = vi.fn();
    const res = mockRes();

    middleware({ user: { role: 'Admin' } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    middleware({ user: { role: 'Renter' } }, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('rejects unlisted role with multiple roles', () => {
    const middleware = authorize('Admin', 'Renter');
    const req = { user: { role: 'User' } };
    const res = mockRes();
    const next = vi.fn();
    middleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes with no arguments (any role allowed)', () => {
    const middleware = authorize();
    const next = vi.fn();
    const res = mockRes();

    middleware({ user: { role: 'User' } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    middleware({ user: { role: 'Admin' } }, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
