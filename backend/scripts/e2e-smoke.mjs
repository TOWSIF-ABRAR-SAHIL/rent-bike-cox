#!/usr/bin/env node
'use strict';

/**
 * E2E smoke seed — zero dependencies, plain Node 20+.
 *
 * Hits a RUNNING backend (local, staging, or prod) and exercises the critical
 * path end to end: login -> available bikes -> create booking (with
 * pickupLocation) -> verify persistence -> cancel booking (self-cleaning).
 * Also asserts the removed /api/documents surface stays gone (audit proof).
 *
 * Usage:
 *   E2E_API_URL=https://rent-bike-backend.onrender.com/api \
 *   E2E_EMAIL=user@rentbikecox.com E2E_PASSWORD=user123 \
 *   node scripts/e2e-smoke.mjs
 * Or via npm: `npm run test:e2e` (backend/package.json).
 *
 * Exit code is non-zero on any failure — CI-ready for the staging job (T1).
 * Do NOT point this at prod from CI on every push; it writes one booking
 * (immediately cancelled). Manual or scheduled runs only.
 */

const API = (process.env.E2E_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const EMAIL = process.env.E2E_EMAIL || 'user@rentbikecox.com';
const PASSWORD = process.env.E2E_PASSWORD || 'user123';

let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && cond ? ` (${extra})` : ''}${extra && !cond ? ` — ${extra}` : ''}`);
  if (!cond) failures += 1;
}
async function j(res) {
  try { return await res.json(); } catch { return {}; }
}

(async () => {
  // 1. health
  const h = await fetch(`${API}/health`);
  check('health ok', h.ok);

  // 2. login
  const lr = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await j(lr);
  check('login returns accessToken', !!lj.accessToken, lr.status);
  const tok = lj.accessToken;
  if (!tok) return process.exit(1);
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` };

  // 3. available bikes
  const br = await fetch(`${API}/dashboard/bikes/available`);
  const bj = await j(br);
  const list = Array.isArray(bj) ? bj : bj.bikes || [];
  check('available bikes listed', list.length > 0, `${list.length} bikes`);
  if (!list.length) return process.exit(1);

  // 4. create booking with pickupLocation, verify persistence
  const bike = list[0];
  const cr = await fetch(`${API}/booking`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      bikeId: bike._id,
      startTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      pickupLocation: 'Marine Drive',
    }),
  });
  const cj = await j(cr);
  check('booking created', cr.status === 201, `status ${cr.status}`);
  check('pickupLocation persisted', cj.booking?.pickupLocation === 'Marine Drive', cj.booking?.pickupLocation);
  const bookingId = cj.booking?._id;

  // 5. cancel (self-cleaning)
  if (bookingId) {
    const dr = await fetch(`${API}/booking/${bookingId}/cancel`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ reason: 'e2e smoke test' }),
    });
    check('booking cancelled (cleanup)', dr.ok, `status ${dr.status}`);
  }

  // 6. removed documents surface stays removed (audit regression proof)
  const docs = await fetch(`${API}/documents/abc/registration`);
  check('documents route removed', docs.status === 404, `status ${docs.status}`);

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL SMOKE CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
