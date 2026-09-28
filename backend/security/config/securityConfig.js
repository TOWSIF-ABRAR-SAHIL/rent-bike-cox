const securityConfig = {
  jwt: {
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'rentbikecox',
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    maxAge: 90,
    preventReuse: 5,
  },
  lockout: {
    maxAttempts: 5,
    lockDuration: 15 * 60 * 1000,
    windowMs: 15 * 60 * 1000,
  },
  // NOTE: rate limits are defined in server.js, which is the single source of
  // truth and registers each limiter with the admin rate-limit view. The block that
  // used to live here (auth 10, payment 5/hour, booking 10/hour) was never read by
  // anything and contradicted the values actually enforced, so it was removed
  // rather than left to mislead the next reader.
  upload: {
    maxSizeBytes: 5 * 1024 * 1024,
    maxDocSizeBytes: 1 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxDimensions: { width: 4000, height: 4000 },
  },
  session: {
    maxActiveSessions: 10,
    refreshRotation: true,
  },
  security: {
    requestTimeoutMs: 30 * 1000,
    maxRequestBody: '1mb',
    trustProxy: 1,
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
};

module.exports = securityConfig;
