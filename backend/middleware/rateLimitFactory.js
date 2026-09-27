const { rateLimit } = require('express-rate-limit');
const { registerLimiter } = require('../controllers/rateLimitController');

/**
 * Build a rate limiter and register the options it was built from.
 *
 * `express-rate-limit` v8 returns a bare middleware function — `Object.keys()` on it
 * yields only `resetKey` and `getKey`. The admin Rate Limits view reads `windowMs`,
 * `max` and `message` off whatever is registered, so registering the middleware
 * itself left every card blank (`Rate NaN/m`). Register the options instead, and
 * always create limiters through here so that cannot regress.
 */
function makeLimiter(name, options) {
  registerLimiter(name, options);
  return rateLimit(options);
}

module.exports = { makeLimiter };
