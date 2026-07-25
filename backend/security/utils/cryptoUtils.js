const crypto = require('crypto');
const securityConfig = require('../config/securityConfig');

const ALGORITHM = securityConfig.encryption.algorithm;
const KEY_LENGTH = securityConfig.encryption.keyLength;
const IV_LENGTH = securityConfig.encryption.ivLength;
const TAG_LENGTH = securityConfig.encryption.tagLength;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
  }
  return buf;
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  if (typeof plaintext !== 'string') plaintext = String(plaintext);

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) return ciphertext;
  if (typeof ciphertext !== 'string') return ciphertext;

  if (!ciphertext.includes(':')) return ciphertext;

  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext;
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  hashToken,
  generateSecureToken,
};
