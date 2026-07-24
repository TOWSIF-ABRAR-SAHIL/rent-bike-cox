const mongoose = require('mongoose');
const { verifyIPN } = require('./sslcommerz');

const MAX_CALLBACK_AGE_MS = 300 * 1000;

const processedNonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});
processedNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProcessedNonce = mongoose.model('ProcessedNonce', processedNonceSchema);

async function isProcessed(nonce) {
  const exists = await ProcessedNonce.findOne({ nonce }).lean();
  return !!exists;
}

async function markProcessed(nonce) {
  try {
    await ProcessedNonce.create({
      nonce,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return false;
  } catch (err) {
    if (err.code === 11000) return true;
    throw err;
  }
}

async function verifyCallbackIntegrity(valId, bookingId) {
  const verified = await verifyIPN(valId);
  if (!verified || (verified.status !== 'VALID' && verified.status !== 'VALIDATED')) {
    return { valid: false, error: 'SSLCommerz verification failed', verified };
  }
  return { valid: true, verified };
}

module.exports = {
  isProcessed,
  markProcessed,
  verifyCallbackIntegrity,
  ProcessedNonce,
  MAX_CALLBACK_AGE_MS,
};
