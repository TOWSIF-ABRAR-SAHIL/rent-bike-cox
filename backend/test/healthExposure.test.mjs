/**
 * The health router is the one place that answers without a session, so it is where
 * process internals leak by default: /info used to hand out the pid, NODE_ENV, node
 * version, heap sizes and start time to anonymous callers. These tests mount the real
 * router in a real express app and check what an unauthenticated caller can see.
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
const healthRoutes = require('../routes/health');

const INTERNAL_FIELDS = ['pid', 'env', 'nodeVersion', 'startedAt', 'memory', 'uptime'];

let server;
let base;

beforeAll(async () => {
  const app = express();
  app.use('/api/health', healthRoutes);
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function probe(pathname, headers) {
  const res = await fetch(base + pathname, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, text, json };
}

function leakedFields(body) {
  if (!body || typeof body !== 'object') return [];
  return INTERNAL_FIELDS.filter(field => field in body);
}

describe('health endpoints and anonymous callers', () => {
  it('/info requires a session', async () => {
    const { status, text } = await probe('/api/health/info');
    expect(status).toBe(401);
    expect(text).not.toMatch(/pid|nodeVersion|startedAt/);
    expect(text).not.toMatch(/"env"/);
  });

  it('/info rejects an invalid token instead of answering', async () => {
    const { status } = await probe('/api/health/info', { Authorization: 'Bearer not.a.real.token' });
    expect(status).toBe(401);
  });

  it('/info is restricted to Admin, not just any session', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'routes/health.js'), 'utf8');
    expect(source).toMatch(/router\.get\(\s*'\/info'\s*,\s*auth\s*,\s*authorize\('Admin'\)/);
  });

  it.each(['/api/health/liveness', '/api/health/readiness'])('%s stays public and leaks nothing', async (pathname) => {
    const { status, json } = await probe(pathname);
    // Public by design: a monitor has to reach it without credentials. It may report
    // readiness, so any of 200/503 is acceptable here.
    expect([200, 503]).toContain(status);
    expect(leakedFields(json)).toEqual([]);
  });

  it('exposes no process internals on any endpoint reachable without credentials', async () => {
    const routes = ['/api/health/info', '/api/health/liveness', '/api/health/readiness'];
    const offenders = [];
    for (const route of routes) {
      const { status, json } = await probe(route);
      if (status !== 401 && leakedFields(json).length > 0) {
        offenders.push(`${route} -> ${leakedFields(json).join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the bare /api/health probe in server.js reports status only', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');
    const block = source.slice(source.indexOf("app.get('/api/health'"));
    const handler = block.slice(0, block.indexOf('});') + 3);
    expect(handler).not.toMatch(/process\.(memoryUsage|pid|uptime|version)/);
    expect(handler).not.toMatch(/NODE_ENV/);
  });
});
