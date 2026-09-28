const crypto = require('crypto');

/**
 * Keyed hashing for low-entropy identifiers (NID, phone number).
 *
 * These fields are encrypted at rest, but duplicate detection still needs a
 * comparable value. A plain SHA-256 of a 10-digit NID is trivially reversible —
 * the whole keyspace is enumerable — so the digest is keyed with a server-side
 * pepper that never leaves the environment.
 *
 * Peppers are optional: without one the app runs in plaintext mode (see
 * `models/User.js`) and duplicate detection falls back to the stored field.
 */
const PEPPER_ENV_VARS = ['PII_HASH_PEPPER', 'ENCRYPTION_KEY'];

function getPepper() {
  for (const name of PEPPER_ENV_VARS) {
    if (process.env[name]) return process.env[name];
  }
  return null;
}

function isHashingAvailable() {
  return !!getPepper();
}

/**
 * Normalise before hashing so formatting differences don't create duplicate
 * accounts: NIDs and phone numbers are digits, with or without spacing.
 */
function normalizeIdentifier(value) {
  return String(value == null ? '' : value).replace(/\s+/g, '').trim();
}

/**
 * @returns {string|null} hex digest, or null when no pepper is configured or the
 *   value is empty (so the sparse unique index stays sparse).
 */
function hashIdentifier(value, pepper = getPepper()) {
  const normalized = normalizeIdentifier(value);
  if (!normalized || !pepper) return null;
  return crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
}

module.exports = {
  hashIdentifier,
  normalizeIdentifier,
  isHashingAvailable,
  getPepper,
};
