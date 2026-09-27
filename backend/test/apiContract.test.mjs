/**
 * Contract tests: every field a component reads must exist in the response its
 * endpoint actually returns.
 *
 * Two admin tabs shipped reading fields their API never sent — the Rate Limits tab
 * printed "Rate NaN/m" and the System Health tab printed "Heap Used 0 B", "Cores 0"
 * and "Environment Unknown" — and nothing caught it, because a component that reads
 * a missing field just renders a blank or a zero.
 *
 * Each contract wires a component file to a response produced by the real controller
 * (no database needed: the health controller skips its DB work when mongoose is not
 * connected). Adding one is a three-line entry: see CONTRACTS.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, '..');
const frontendRoot = path.join(backendRoot, '..', 'frontend');

const systemHealthController = require('../controllers/systemHealthController');
const rateLimitController = require('../controllers/rateLimitController');
const { makeLimiter } = require('../middleware/rateLimitFactory');

async function callController(handler) {
  let captured;
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { captured = body; return this; },
  };
  await handler({ user: { id: 'contract-test' }, body: {}, params: {}, query: {} }, res);
  if (captured === undefined) throw new Error('controller did not call res.json');
  return captured;
}

const componentSource = (relPath) => fs.readFileSync(path.join(frontendRoot, relPath), 'utf8');

// Pulls `root.a.b` / `root?.a?.b` chains out of a component and returns the paths
// without the root, so they can be looked up in the response body.
function extractReadPaths(source, roots) {
  const rootAlt = roots.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const chain = new RegExp(`\\b(?:${rootAlt})(?:\\??\\.)[A-Za-z_$][\\w$]*(?:\\??\\.[A-Za-z_$][\\w$]*)*`, 'g');
  const found = new Set();
  for (const match of source.matchAll(chain)) {
    found.add(match[0].split(/\??\./).slice(1).join('.'));
  }
  return found;
}

const getPath = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

// A field is only usable if it is present and not NaN: 0 and '' are legitimate values
// (a report with no rows, a collection count of zero), undefined/null are not.
function unusable(value) {
  return value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value));
}

const CONTRACTS = [
  {
    name: 'System Health tab ← GET /api/admin/system-health',
    component: 'src/components/admin/SystemHealthTab.jsx',
    roots: ['health'],
    response: () => callController(systemHealthController.getSystemHealth),
  },
  {
    name: 'Rate Limits tab ← GET /api/admin/rate-limits',
    component: 'src/components/admin/RateLimitManager.jsx',
    roots: ['cfg'],
    response: async () => {
      // The view reads whatever the limiters were registered with, so a real
      // registration is what has to be inspected here.
      makeLimiter('contract-sample', {
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { message: 'sample' },
        standardHeaders: true,
        legacyHeaders: false,
      });
      return callController(rateLimitController.getRateLimits);
    },
  },
];

describe('frontend ↔ API field contracts', () => {
  for (const contract of CONTRACTS) {
    it(`${contract.name} — every field the component reads is present`, async () => {
      const reads = extractReadPaths(componentSource(contract.component), contract.roots);
      // Guard the extractor itself: if the component stops matching, this test would
      // silently pass over an empty set.
      expect(reads.size, `no ${contract.roots.join('/')} reads found in ${contract.component}`).toBeGreaterThan(3);

      const response = await contract.response();
      const samples = Array.isArray(response) ? response : [response];
      expect(samples.length).toBeGreaterThan(0);

      const missing = [];
      for (const read of reads) {
        for (const [index, sample] of samples.entries()) {
          if (unusable(getPath(sample, read))) {
            missing.push(`${read}${samples.length > 1 ? ` (item ${index})` : ''}`);
          }
        }
      }
      expect([...new Set(missing)], `${contract.component} reads these from the response`).toEqual([]);
    });
  }
});

describe('rate limiters are registered as config, not as middleware', () => {
  const serverSource = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');

  it('server.js never registers a limiter itself', () => {
    // express-rate-limit v8 middleware exposes no windowMs/max/message, so a direct
    // registerLimiter(name, middleware) call is exactly the bug that blanked the tab.
    expect(serverSource).not.toMatch(/registerLimiter\s*\(/);
  });

  it('server.js builds every limiter through makeLimiter with a window and a max', () => {
    const calls = [...serverSource.matchAll(/makeLimiter\('([A-Za-z]+)',\s*\{/g)];
    expect(calls.map(c => c[1])).toEqual(
      expect.arrayContaining(['auth', 'booking', 'payment', 'financial', 'upload', 'global', 'search', 'dashboard', 'fleet'])
    );
    for (const call of calls) {
      const options = serverSource.slice(call.index, call.index + 400);
      expect(options, `${call[1]} limiter options`).toMatch(/windowMs:/);
      expect(options, `${call[1]} limiter options`).toMatch(/max:/);
    }
  });

  it('exposes the registered config with numbers the view can compute from', async () => {
    makeLimiter('contract-numbers', {
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: { message: 'nope' },
      standardHeaders: true,
    });
    const configs = await callController(rateLimitController.getRateLimits);
    const entry = configs.find(c => c.name === 'contract-numbers');
    expect(entry.windowMinutes).toBe(60);
    expect(entry.max).toBe(10);
    expect(entry.message).toBe('nope');
    expect(entry.windowMinutes).toBeGreaterThan(0);
  });
});
