const logger = require('../utils/logger');

const SLOW_REQUEST_MS = parseInt(process.env.SLOW_REQUEST_MS, 10) || 3000;

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId,
    };

    if (res.statusCode >= 500) {
      logger.error('request completed', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('request completed', meta);
    } else if (duration > SLOW_REQUEST_MS) {
      logger.warn('slow request', meta);
    } else {
      logger.info('request completed', meta);
    }
  });

  next();
}

module.exports = requestLogger;
