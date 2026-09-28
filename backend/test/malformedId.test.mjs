/**
 * I4 — a malformed `:id` is the caller's mistake, not a server fault.
 *
 * `Model.findById('not-an-id')` throws a mongoose CastError while casting the path
 * parameter, before any query is sent. The central error handler already maps that to
 * 400, but a controller that catches its own errors never reaches it, so
 * `GET /api/vehicle-docs/bike/not-an-id` answered `500 "Failed to load vehicle documents"`.
 * The controller now goes through `clientStatus`/`clientMessage`, which mirror the
 * handler's `CastError` branch.
 *
 * The routes below are the real ones from routes/vehicleDoc.js with the JWT middleware
 * replaced by a stub session, so the controller's own catch is what answers. Only a
 * malformed id is exercised: casting fails without a database, whereas a well-formed id
 * would wait on a buffered query.
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
const mongoose = require('mongoose');
const ctrl = require('../controllers/vehicleDocController');
const trackingCtrl = require('../controllers/trackingController');
const errorHandler = require('../middleware/errorHandler');
const {
  HttpError,
  clientStatus,
  clientMessage,
  isMalformedRequest,
  INVALID_REQUEST_MESSAGE,
} = require('../utils/httpError');

let server;
let base;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // Stand in for authMiddleware + authorize, which are not what this test is about.
  app.use((req, _res, next) => {
    req.user = { id: '64b000000000000000000000', role: 'Admin' };
    req.correlationId = 'malformed-id-probe';
    next();
  });
  app.get('/api/vehicle-docs/bike/:bikeId', ctrl.listByBike);
  app.post('/api/vehicle-docs/bike/:bikeId', ctrl.upload);
  app.put('/api/vehicle-docs/:id', ctrl.update);
  app.patch('/api/vehicle-docs/:id/verify', ctrl.verify);
  app.delete('/api/vehicle-docs/:id', ctrl.remove);
  // Review follow-up: trackingController had the same hard-coded 500s.
  app.get('/api/tracking/history/:bikeId', trackingCtrl.getHistory);
  app.get('/api/tracking/:bikeId', trackingCtrl.getBikeLocation);
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

const MALFORMED = 'not-an-id';

describe('a malformed id answers 400, never 500', () => {
  it.each([
    ['GET  /vehicle-docs/bike/:bikeId', () => probe(`/api/vehicle-docs/bike/${MALFORMED}`)],
    ['POST /vehicle-docs/bike/:bikeId', () => probe(`/api/vehicle-docs/bike/${MALFORMED}`, { method: 'POST' })],
    ['PUT  /vehicle-docs/:id', () => probe(`/api/vehicle-docs/${MALFORMED}`, { method: 'PUT' })],
    ['PATCH /vehicle-docs/:id/verify', () => probe(`/api/vehicle-docs/${MALFORMED}/verify`, { method: 'PATCH' })],
    ['DELETE /vehicle-docs/:id', () => probe(`/api/vehicle-docs/${MALFORMED}`, { method: 'DELETE' })],
  ])('%s', async (_label, request) => {
    const res = await request();
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: INVALID_REQUEST_MESSAGE });
    // The CastError text names the model and the rejected value's type.
    expect(res.text).not.toContain('Cast to ObjectId');
    expect(res.text).not.toContain('VehicleDocument');
    expect(res.text).not.toContain('Failed to');
  });

  it('the controller no longer hard-codes a 500 in any catch', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'controllers/vehicleDocController.js'), 'utf8');
    expect(source).not.toMatch(/res\.status\(500\)/);
    // One call per handler: listByBike, listMyDocs, upload, update, verify, remove, expiring.
    expect((source.match(/clientStatus\(/g) || []).length).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ['GET /tracking/history/:bikeId', () => probe(`/api/tracking/history/${MALFORMED}`)],
    ['GET /tracking/:bikeId', () => probe(`/api/tracking/${MALFORMED}`)],
  ])('tracking %s', async (_label, request) => {
    const res = await request();
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ message: INVALID_REQUEST_MESSAGE });
    expect(res.text).not.toContain('Cast to ObjectId');
    expect(res.text).not.toContain('Tracking request failed');
  });

  it('trackingController no longer hard-codes a 500 in any catch', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'controllers/trackingController.js'), 'utf8');
    expect(source).not.toMatch(/res\.status\(500\)/);
    expect((source.match(/clientStatus\(/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('the client helpers mirror the central handler', () => {
  const cast = new mongoose.Error.CastError('ObjectId', MALFORMED, '_id');

  it('recognises exactly CastError and ValidationError as malformed requests', () => {
    expect(isMalformedRequest(cast)).toBe(true);
    const validation = new mongoose.Error.ValidationError();
    expect(isMalformedRequest(validation)).toBe(true);
    expect(isMalformedRequest(new Error('boom'))).toBe(false);
    expect(isMalformedRequest(undefined)).toBe(false);
  });

  it('maps a CastError to 400 whatever the fallback, without leaking its message', () => {
    expect(clientStatus(cast, 500)).toBe(400);
    expect(clientMessage(cast, 'Failed to load vehicle documents')).toBe(INVALID_REQUEST_MESSAGE);
  });

  it('keeps a genuine server fault at its fallback', () => {
    expect(clientStatus(new Error('connection lost'), 500)).toBe(500);
    expect(clientMessage(new Error('connection lost'), 'Failed to load vehicle documents'))
      .toBe('Failed to load vehicle documents');
  });

  it('still honours a status we authored', () => {
    expect(clientStatus(new HttpError(404, 'Bike not found'), 500)).toBe(404);
    expect(clientMessage(new HttpError(404, 'Bike not found'), 'fallback')).toBe('Bike not found');
  });

  it('keeps a schema validation message', () => {
    const validation = new mongoose.Error.ValidationError();
    validation.addError('name', new mongoose.Error.ValidatorError({ path: 'name', message: 'Path `name` is required.' }));
    expect(clientStatus(validation, 500)).toBe(400);
    expect(clientMessage(validation, 'fallback')).toContain('Path `name` is required');
  });
});
