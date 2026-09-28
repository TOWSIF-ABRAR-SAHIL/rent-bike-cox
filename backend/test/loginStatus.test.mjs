/**
 * A rejected login is an authentication failure (401), not a malformed request (400).
 *
 * `login` answered `400 {"message":"Invalid credentials"}` for both an unknown email
 * and a wrong password, which told every client — and the axios interceptor — that the
 * request was malformed rather than that the credentials were refused. The route's own
 * OpenAPI block and docs/Error-handling.md both document 401.
 *
 * The real auth router is mounted with the model calls the handler makes stubbed out
 * (there is no database here), so the status is exercised end to end rather than
 * asserted against the source.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, '..');

const express = require('express');
const bcrypt = require('bcryptjs');
const authRoutes = require('../routes/auth');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const AuditLog = require('../models/AuditLog');

const originals = {
  findOne: User.findOne,
  countDocuments: LoginAttempt.countDocuments,
  create: LoginAttempt.create,
  auditCreate: AuditLog.create,
};

const KNOWN_EMAIL = 'rider@example.com';

let server;
let base;
let passwordHash;

/** The login handler's model calls, answered without a connection. */
function stubModels({ user }) {
  User.findOne = () => ({ select: () => Promise.resolve(user) });
  LoginAttempt.countDocuments = async () => 0;
  LoginAttempt.create = async () => ({});
  AuditLog.create = async () => ({});
}

beforeAll(async () => {
  passwordHash = await bcrypt.hash('correct-password', 8);
  stubModels({ user: null });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  User.findOne = originals.findOne;
  LoginAttempt.countDocuments = originals.countDocuments;
  LoginAttempt.create = originals.create;
  AuditLog.create = originals.auditCreate;
  if (server) await new Promise(resolve => server.close(resolve));
});

async function login(body) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

describe('login rejects bad credentials with 401', () => {
  it('answers 401 for an unknown email', async () => {
    stubModels({ user: null });
    const res = await login({ email: 'nobody@example.com', password: 'whatever-password' });
    expect(res.status).toBe(401);
    expect(res.json).toEqual({ message: 'Invalid credentials' });
  });

  it('answers 401 for a wrong password on a known account', async () => {
    stubModels({ user: { _id: '64b000000000000000000000', email: KNOWN_EMAIL, role: 'User', password: passwordHash } });
    const res = await login({ email: KNOWN_EMAIL, password: 'definitely-not-it' });
    expect(res.status).toBe(401);
    expect(res.json).toEqual({ message: 'Invalid credentials' });
  });

  it('still answers 400 for a request that is actually malformed', async () => {
    // A missing password never reaches the credential check — that is the 400 case.
    const res = await login({ email: KNOWN_EMAIL, password: '' });
    expect(res.status).toBe(400);
  });

  it('leaves no 400 credential rejection in the controller', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'controllers/authController.js'), 'utf8');
    expect(source).not.toMatch(/status\(400\)\.json\(\{\s*message:\s*'Invalid credentials'/);
    expect((source.match(/status\(401\)\.json\(\{\s*message:\s*'Invalid credentials'/g) || []).length).toBe(2);
  });
});
