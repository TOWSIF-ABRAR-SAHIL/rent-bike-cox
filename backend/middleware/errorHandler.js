const logger = require('../utils/logger');
const { isClientFacing, statusMessage, validationMessage } = require('../utils/httpError');
const { reportServerError } = require('../utils/sentry');

// Multer's own codes. Messages are ours: multer's text names internal parser state.
const UPLOAD_ERRORS = {
  LIMIT_FILE_SIZE: 'File too large. Maximum size is 5MB.',
  LIMIT_FILE_COUNT: 'Too many files in one upload',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field in this upload',
  LIMIT_PART_COUNT: 'Too many parts in this upload',
  LIMIT_FIELD_COUNT: 'Too many form fields in this upload',
  LIMIT_FIELD_KEY: 'Form field name is too long',
  LIMIT_FIELD_VALUE: 'Form field value is too long',
};

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

  if (UPLOAD_ERRORS[err.code]) {
    logger.warn('Upload rejected', meta);
    return res.status(400).json({ message: UPLOAD_ERRORS[err.code] });
  }

  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token invalid', meta);
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  // Our own errors (utils/httpError.js HttpError, thrown by controllers, services
  // and the upload middleware) carry a message written for the caller, and that is
  // the only thing that unlocks passing a message through.
  //
  // What this replaces: the branch used to forward err.message for *any* error
  // holding a `.status` below 500. axios, http-errors, body-parser and the gateway
  // SDKs all set one, so their raw text was echoed — on top of which body-parser's
  // package (http-errors) marks its 4xx errors `expose: true`, so a boolean flag is
  // not ownership either; isClientFacing() checks a symbol only HttpError sets.
  // error-detail-ok: the single place a caller-visible message may be forwarded.
  if (isClientFacing(err) && typeof err.status === 'number') {
    logger.warn('Client error', meta);
    return res.status(err.status).json({ message: err.message });
  }

  if (err.name === 'CastError' || err.name === 'ValidationError') {
    logger.warn('Validation error', meta);
    // Schema messages name a field and its constraint, which is what the caller
    // needs to fix the request; mongoose's CastError text is not forwarded.
    return res.status(400).json({ message: validationMessage(err) || 'Invalid request data' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn('Auth token error', meta);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Mongo's duplicate-key error. Its message embeds the collection, the index and
  // the duplicated value ("...dup key: { email: \"a@b.c\" }"), which is both an
  // internal detail and an account-existence oracle.
  if (err.code === 11000) {
    logger.warn('Duplicate key', meta);
    return res.status(409).json({ message: 'A record with that value already exists' });
  }

  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    logger.warn('Client error (message withheld)', meta);
    return res.status(err.status).json({ message: statusMessage(err.status) });
  }

  logger.error('Unhandled error', {
    ...meta,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
  reportServerError(err, req);
  // The correlation id is the same one in the log line above, so a user reporting
  // "it broke" can be matched to the stack trace without the trace leaving the server.
  res.status(500).json({
    message: 'Internal server error',
    ...(req.correlationId ? { correlationId: req.correlationId } : {}),
  });
}

module.exports = errorHandler;
