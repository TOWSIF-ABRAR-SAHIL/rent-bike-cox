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
  rateLimits: {
    auth: { windowMs: 15 * 60 * 1000, max: 10 },
    booking: { windowMs: 60 * 60 * 1000, max: 10 },
    payment: { windowMs: 60 * 60 * 1000, max: 5 },
    coupon: { windowMs: 60 * 1000, max: 3 },
    upload: { windowMs: 60 * 60 * 1000, max: 10 },
    general: { windowMs: 60 * 1000, max: 100 },
  },
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
