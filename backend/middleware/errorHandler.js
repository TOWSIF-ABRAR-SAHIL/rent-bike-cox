const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const meta = {
    error: err.message,
    code: err.code,
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl || req.url,
  };

  if (res.headersSent) {
    logger.warn('Headers already sent, error swallowed', meta);
    return;
  }

  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS blocked', meta);
    return res.status(403).json({ message: 'Not allowed by CORS' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn('File too large', meta);
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }

  if (err.message && err.message.includes('Only JPG')) {
    logger.warn('Invalid file type', meta);
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token invalid', meta);
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  if (err.name === 'CastError' || err.name === 'ValidationError') {
    logger.warn('Validation error', meta);
    return res.status(400).json({ message: 'Invalid request data' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn('Auth token error', meta);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (err.status && err.status < 500) {
    logger.warn('Client error', meta);
    return res.status(err.status).json({ message: err.message });
  }

  logger.error('Unhandled error', { ...meta, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined });
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorHandler;
