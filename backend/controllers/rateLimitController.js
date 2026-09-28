const logger = require('../utils/logger');

// Registered *options*, not the limiter middleware. express-rate-limit v8 returns a
// bare function (`resetKey`, `getKey` and nothing else), so reading `windowMs`/`max`
// off a registered middleware yields undefined — which is what turned this endpoint
// into `[{ name, windowMinutes: null }]` and made every card in the admin Rate Limits
// tab read "Rate NaN/m". Limiters are built through middleware/rateLimitFactory.js,
// which registers the options they were created from.
const limiters = {};

function registerLimiter(name, options) {
  limiters[name] = options;
}

exports.getRateLimits = (req, res) => {
  try {
    const configs = Object.entries(limiters).map(([name, options]) => ({
      name,
      windowMs: options.windowMs,
      max: typeof options.max === 'function' ? 'dynamic' : options.max,
      windowMinutes: Number.isFinite(options.windowMs) ? Math.round(options.windowMs / 60000) : null,
      message: options.message?.message || 'Too many requests',
      standardHeaders: options.standardHeaders,
    }));
    res.json(configs);
  } catch (error) {
    logger.error('getRateLimits error:', error.message);
    res.status(500).json({ message: 'Failed to get rate limit configs' });
  }
};

module.exports = exports;
exports.registerLimiter = registerLimiter;
