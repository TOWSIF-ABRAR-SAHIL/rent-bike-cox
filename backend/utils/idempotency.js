const IdempotencyKey = require('../models/IdempotencyKey');
const crypto = require('crypto');

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function extractIdempotencyKey(req) {
  return req.headers['x-idempotency-key'] || req.body?.idempotencyKey || null;
}

function computeRequestHash(req) {
  const parts = [
    req.method,
    req.originalUrl,
    JSON.stringify(req.body || {}),
    req.user?.id || 'anonymous',
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function idempotencyMiddleware(ttlMs = DEFAULT_TTL_MS) {
  return async (req, res, next) => {
    const explicitKey = extractIdempotencyKey(req);
    const hash = computeRequestHash(req);
    const lookupKey = explicitKey || `hash:${hash}`;

    try {
      const existing = await IdempotencyKey.findOne({ key: lookupKey });
      if (existing) {
        res.status(existing.statusCode || 200).json(existing.response);
        return;
      }
    } catch (err) {
      console.error('[Idempotency] Lookup error (proceeding):', err.message);
    }

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const cacheKey = explicitKey || `hash:${computeRequestHash(req)}`;
      IdempotencyKey.create({
        key: cacheKey,
        response: body,
        statusCode: res.statusCode,
        expiresAt: new Date(Date.now() + ttlMs),
      }).catch(err => console.error('[Idempotency] Cache write error:', err.message));

      return originalJson(body);
    };

    next();
  };
}

async function checkAndMarkNonce(nonce, ttlMs = 300000) {
  if (!nonce) return false;

  const existing = await IdempotencyKey.findOne({ key: `nonce:${nonce}` });
  if (existing) return true;

  try {
    await IdempotencyKey.create({
      key: `nonce:${nonce}`,
      response: { processed: true },
      statusCode: 200,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return false;
  } catch (err) {
    if (err.code === 11000) return true;
    throw err;
  }
}

module.exports = {
  idempotencyMiddleware,
  extractIdempotencyKey,
  computeRequestHash,
  checkAndMarkNonce,
};
