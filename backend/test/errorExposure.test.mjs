/**
 * What an error response is allowed to say.
 *
 * Nothing stopped a controller from answering `{ message: err.message }`, and seven
 * of them did. That text is whatever the failing layer decided to say: mongoose
 * names the Atlas cluster and the collection it hit, its duplicate-key error quotes
 * the index and the duplicate value (an account-existence oracle), axios quotes the
 * upstream URL, SMTP quotes the relay it could not authenticate against. The global
 * handler had the same hole from the other direction — it forwarded err.message for
 * any error carrying a `.status` under 500, which axios, http-errors, body-parser and
 * gateway SDKs all set.
 *
 * These tests are in two halves:
 *  1. runtime — mount the real handler and the real upload middleware, throw hostile
 *     errors at them, and assert no internal text reaches the body;
 *  2. static — read every backend source file, find each response call, and fail if
 *     its argument mentions an error's message or stack. A new controller that echoes
 *     err.message fails here before it ever ships.
 *
 * Set ERROR_SWEEP_DIR to sweep a different tree (used to prove the static half fails
 * against the pre-fix sources).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, '..');
const sweepRoot = process.env.ERROR_SWEEP_DIR || backendRoot;

const express = require('express');
const mongoose = require('mongoose');
const errorHandler = require('../middleware/errorHandler');
const upload = require('../middleware/uploadMiddleware');
const { HttpError } = require('../utils/httpError');

// Strings that must never appear in a response body. Each one comes from an error
// thrown by the probe routes below.
const SENTINELS = [
  'mongodb+srv://',
  'cluster0.jcglevo.mongodb.net',
  'rentbike.users',
  'victim@example.com',
  'api.cloudinary.com',
  'Cast to ObjectId',
  'Unexpected token',
  'kaboom',
  '/srv/app/secret.js',
  'validation failed',
  'C:\\app',
  '/opt/render/project/src',
];

let server;
let base;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // The real pipeline sets this in middleware/correlationId.js.
  app.use((req, _res, next) => { req.correlationId = 'probe-correlation-id'; next(); });

  // An error we authored: the caller should see it verbatim.
  app.get('/ours', () => { throw new HttpError(400, 'Model, brand and price are required'); });

  // The driver refusing to connect — the classic leak, credentials and all.
  app.get('/driver', () => {
    const err = new Error('connect ECONNREFUSED mongodb+srv://rentbike:hunter2@cluster0.jcglevo.mongodb.net/rentbike');
    err.name = 'MongoServerError';
    throw err;
  });

  app.get('/duplicate', () => {
    const err = new Error('E11000 duplicate key error collection: rentbike.users index: email_1 dup key: { email: "victim@example.com" }');
    err.code = 11000;
    throw err;
  });

  // A library 4xx of the http-errors shape: it sets both `.status` and
  // `expose: true`, which is how body-parser's own parse text leaked through.
  app.get('/http-errors', () => {
    const err = new Error('Unexpected token in JSON at /opt/render/project/src/app.js');
    err.status = 400;
    err.statusCode = 400;
    err.expose = true;
    throw err;
  });

  // A third-party client error: axios sets `.status`, so the old handler forwarded it.
  app.get('/upstream', () => {
    const err = new Error('Request failed with status code 401: api.cloudinary.com/v1_1/demo/upload rejected api_secret=abc123');
    err.name = 'AxiosError';
    err.status = 400;
    throw err;
  });

  app.get('/cast', () => {
    throw new mongoose.Error.CastError('ObjectId', 'not-an-id', '_id');
  });

  app.get('/boom', () => {
    throw new Error('kaboom while reading /srv/app/secret.js');
  });

  // Real schema validation: our message, assembled by mongoose from the schema.
  app.get('/validation', () => {
    const Probe = mongoose.models.__ErrorExposureProbe
      || mongoose.model('__ErrorExposureProbe', new mongoose.Schema({ name: { type: String, required: true } }));
    throw new Probe({}).validateSync();
  });

  app.post('/upload', upload.single('file'), (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function probe(pathname, init) {
  const res = await fetch(base + pathname, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, text, json };
}

function expectNoLeak(result) {
  for (const sentinel of SENTINELS) {
    expect(result.text, `response leaked "${sentinel}"`).not.toContain(sentinel);
  }
}

function formWith(file) {
  const form = new FormData();
  form.append('file', file);
  return { method: 'POST', body: form };
}

describe('error responses never carry internal detail', () => {
  it('passes through a message we authored, with its status', async () => {
    const res = await probe('/ours');
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: 'Model, brand and price are required' });
  });

  it('hides driver errors behind a 500 and a correlation id', async () => {
    const res = await probe('/driver');
    expect(res.status).toBe(500);
    expect(res.json).toEqual({ message: 'Internal server error', correlationId: 'probe-correlation-id' });
    expectNoLeak(res);
  });

  it('reports a duplicate key without quoting the collection, index or value', async () => {
    const res = await probe('/duplicate');
    expect(res.status).toBe(409);
    expect(res.json.message).toBe('A record with that value already exists');
    expectNoLeak(res);
  });

  it('ignores the expose flag a library sets on its own 4xx errors', async () => {
    // Found by probing the running server: my first attempt gated on `err.expose`,
    // and http-errors sets that to true, so body-parser's raw parse text came back
    // out verbatim. Ownership has to be something a library cannot set.
    const res = await probe('/http-errors');
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: 'Invalid request' });
    expectNoLeak(res);
  });

  it('does not forward a third-party error just because it carries a .status', async () => {
    const res = await probe('/upstream');
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: 'Invalid request' });
    expectNoLeak(res);
  });

  it('answers a cast failure 400 without naming the model', async () => {
    const res = await probe('/cast');
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: 'Invalid request data' });
    expectNoLeak(res);
  });

  it('keeps a schema validation message but not mongoose\u2019s summary line', async () => {
    const res = await probe('/validation');
    expect(res.status).toBe(400);
    expect(res.json.message).toContain('Path `name` is required');
    // The summary ("__ErrorExposureProbe validation failed: ...") names the model.
    expectNoLeak(res);
  });

  it('hides an unexpected error behind a 500 even in production', async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await probe('/boom');
      expect(res.status).toBe(500);
      expect(res.json).toEqual({ message: 'Internal server error', correlationId: 'probe-correlation-id' });
      expectNoLeak(res);
    } finally {
      process.env.NODE_ENV = before;
    }
  });

  it('does not repeat body-parser\u2019s parse error', async () => {
    const res = await probe('/ours', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"name": ',
    });
    expect(res.status).toBe(400);
    expectNoLeak(res);
  });

  it('rejects a 6 MB non-image with 400 in our own wording', async () => {
    // Content is checked before the size limit, so this is refused as unidentifiable rather
    // than as "too large" — either way it is a 400 carrying our text, and nothing internal.
    // The size-limit path itself is covered in test/uploadContentGuard.test.mjs, which can
    // drive it without contacting the CDN.
    const res = await probe('/upload', formWith(new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' })));
    expect(res.status).toBe(400);
    expect(res.json.message).toBe('Unable to determine file type from content');
    expectNoLeak(res);
  });

  // Content (magic byte) rejection lives in test/uploadContentGuard.test.mjs — it needs
  // the stream path that the Cloudinary storage uses, not just the buffer one.

  it('rejects a disallowed mimetype with our own wording', async () => {
    const res = await probe('/upload', formWith(new Blob(['%PDF-1.4'], { type: 'application/pdf' })));
    expect(res.status).toBe(400);
    expect(res.json.message).toBe('Only JPG, JPEG, and PNG files are allowed');
    expectNoLeak(res);
  });
});

// ---------------------------------------------------------------------------
// Static half: no response in the backend may be built from an error's message.
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', 'test', 'tests', '__tests__', 'scripts', '.git', 'coverage', 'logs']);
const RESPONSE_CALL = /\.(?:json|send|end|sendStatus)\s*\(/g;
// An error-ish receiver followed by a message/stack read: err.message, saveError.message,
// nErr?.message, e.stack. A legitimate payload field (`template.message`) does not match.
const ERROR_DETAIL_READ = /\b(?:\w*(?:[Ee]rror|[Ee]rr)\w*|e|ex)(?:\?\.|\.)(?:message|stack|errors)\b/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.js')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** The text between a call's opening parenthesis and its matching close. */
function callArguments(source, openParen) {
  let depth = 1;
  let quote = null;
  for (let i = openParen + 1; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(openParen + 1, i);
    }
  }
  return source.slice(openParen + 1);
}

// An escape hatch that has to justify itself in the source, three lines above the call.
const EXEMPTION = /\/\/\s*error-detail-ok:\s*(\S.{9,})/;

function findResponseLeaks(source) {
  const offenses = [];
  const exemptions = [];
  for (const match of source.matchAll(RESPONSE_CALL)) {
    const openParen = match.index + match[0].length - 1;
    const args = callArguments(source, openParen);
    const detail = ERROR_DETAIL_READ.exec(args);
    if (!detail) continue;
    const line = source.slice(0, match.index).split('\n').length;
    // The call's own line is truncated at the match, so it counts as one slot.
    const preceding = source.slice(0, match.index).split('\n').slice(-5).join('\n');
    const marker = EXEMPTION.exec(preceding);
    const record = { line, call: match[0].trim(), detail: detail[0] };
    if (marker) exemptions.push({ ...record, reason: marker[1] });
    else offenses.push(record);
  }
  return { offenses, exemptions };
}

describe('no response is built from an error\u2019s own text', () => {
  const files = walk(sweepRoot).filter(f => !f.includes(`${path.sep}test${path.sep}`));

  it('finds response calls to inspect', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no controller, service or middleware echoing err.message', () => {
    const offenses = [];
    const exemptions = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const found = findResponseLeaks(source);
      for (const offense of found.offenses) {
        offenses.push(`${path.relative(sweepRoot, file)}:${offense.line} — ${offense.call} reads ${offense.detail}`);
      }
      for (const exemption of found.exemptions) {
        exemptions.push(`${path.relative(sweepRoot, file)}:${exemption.line} — ${exemption.reason}`);
      }
    }
    // Throw the HttpError from utils/httpError.js instead: a message only reaches a
    // response body through `err.expose`, which only that class sets.
    expect(offenses).toEqual([]);
    // The escape hatch stays rare enough to review by hand; every use must state why.
    expect(exemptions.length).toBeLessThanOrEqual(3);
  });

  it('detects the pattern it is meant to catch', () => {
    const leaking = "  } catch (err) {\n    res.status(500).json({ message: err.message });\n  }";
    expect(findResponseLeaks(leaking).offenses).toHaveLength(1);
    const safe = "  } catch (err) {\n    logger.error('boom', { error: err.message });\n    res.status(500).json({ message: 'Internal server error' });\n  }";
    expect(findResponseLeaks(safe).offenses).toHaveLength(0);
    const payloadField = 'res.json({ message: template.message, items });';
    expect(findResponseLeaks(payloadField).offenses).toHaveLength(0);
    const exempt = "  // error-detail-ok: gated on an explicit opt-in flag\n  res.json({ message: err.message });";
    expect(findResponseLeaks(exempt).offenses).toHaveLength(0);
    expect(findResponseLeaks(exempt).exemptions).toHaveLength(1);
    // A marker with no reason is not an exemption.
    const bareMarker = "  // error-detail-ok:\n  res.json({ message: err.message });";
    expect(findResponseLeaks(bareMarker).offenses).toHaveLength(1);
  });
});
