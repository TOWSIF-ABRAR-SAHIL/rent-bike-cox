const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const securityConfig = require('../config/securityConfig');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = securityConfig.jwt.accessExpiresIn;
const REFRESH_EXPIRES = securityConfig.jwt.refreshExpiresIn;
const ALGORITHM = securityConfig.jwt.algorithm;
const ISSUER = securityConfig.jwt.issuer;

function generateAccessToken(user, fingerprint) {
  const payload = {
    id: user._id || user.id,
    role: user.role,
    type: 'access',
  };
  if (fingerprint) payload.fp = fingerprint;

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    algorithm: ALGORITHM,
    issuer: ISSUER,
  });
}

function generateRefreshToken(user, familyId) {
  const payload = {
    id: user._id || user.id,
    role: user.role,
    type: 'refresh',
    jti: crypto.randomUUID(),
    family: familyId || crypto.randomUUID(),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    algorithm: ALGORITHM,
    issuer: ISSUER,
  });
}

function verifyToken(token, expectedType = 'access') {
  const decoded = jwt.verify(token, JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  });

  if (decoded.type !== expectedType) {
    throw new Error(`Invalid token type: expected ${expectedType}, got ${decoded.type}`);
  }

  return decoded;
}

function decodeTokenUnsafe(token) {
  return jwt.decode(token);
}

function buildFingerprint(req) {
  const ua = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || '';
  const raw = `${ua}:${ip}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeTokenUnsafe,
  buildFingerprint,
  ACCESS_EXPIRES,
  REFRESH_EXPIRES,
};
