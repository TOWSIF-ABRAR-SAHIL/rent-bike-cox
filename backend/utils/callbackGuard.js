const mongoose = require('mongoose');
const { verifyIPN } = require('./sslcommerz');
const logger = require('./logger');

/**
 * Replay guard for gateway callbacks.
 *
 * A nonce is recorded for each processed callback and expires after 5 minutes.
 * Replay is prevented by this nonce *plus* the atomic status claim on the booking
 * (`findOneAndUpdate({ _id, status: 'Pending' })`): only one caller can move a
 * booking out of Pending, so a duplicate callback can never confirm twice.
 *
 * Note: this previously carried a MAX_CALLBACK_AGE_MS "callback too old" check.
 * It was unreachable — no reliable callback timestamp is available, and the only
 * value on hand was the booking's own createdAt, which would have rejected
 * legitimate payments made more than five minutes after the booking was created.
 */
const NONCE_TTL_MS = 5 * 60 * 1000;

const processedNonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});
processedNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProcessedNonce = mongoose.models.ProcessedNonce
  || mongoose.model('ProcessedNonce', processedNonceSchema);

async function isProcessed(nonce) {
  const exists = await ProcessedNonce.findOne({ nonce }).lean();
  return !!exists;
}

async function markProcessed(nonce) {
  try {
    await ProcessedNonce.create({
      nonce,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    });
    return false;
  } catch (err) {
    if (err.code === 11000) return true;
    logger.warn('Failed to record callback nonce', { nonce, error: err.message });
    throw err;
  }
}

/**
 * Verify a callback against SSLCommerz's validation API.
 * Returns `{ valid, verified?, error? }` — it never throws, so callers can map a
 * failure to a single response.
 */
async function verifyCallbackIntegrity(valId) {
  if (!valId) return { valid: false, error: 'Missing val_id' };

  try {
    const verified = await verifyIPN(valId);
    if (!verified || (verified.status !== 'VALID' && verified.status !== 'VALIDATED')) {
      return { valid: false, error: 'SSLCommerz verification failed', verified };
    }
    return { valid: true, verified };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  isProcessed,
  markProcessed,
  verifyCallbackIntegrity,
  ProcessedNonce,
  NONCE_TTL_MS,
};
