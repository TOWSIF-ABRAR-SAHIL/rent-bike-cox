const logger = require('../utils/logger');

const limiters = {};

function registerLimiter(name, limiter) {
  limiters[name] = limiter;
}

exports.getRateLimits = (req, res) => {
  try {
    const configs = Object.entries(limiters).map(([name, limiter]) => ({
      name,
      windowMs: limiter.windowMs,
      max: typeof limiter.max === 'function' ? 'dynamic' : limiter.max,
      windowMinutes: Math.round(limiter.windowMs / 60000),
      message: limiter.message?.message || 'Too many requests',
      standardHeaders: limiter.standardHeaders,
    }));
    res.json(configs);
  } catch (error) {
    logger.error('getRateLimits error:', error.message);
    res.status(500).json({ message: 'Failed to get rate limit configs' });
  }
};

module.exports = exports;
exports.registerLimiter = registerLimiter;
