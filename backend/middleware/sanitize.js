// Express 5 compatible replacement for express-mongo-sanitize
// Express 5 made req.query a read-only getter, so the library's
// approach of reassigning req.query / req.body / req.params no longer works.

const DANGEROUS_KEYS = /^\$|^__proto__|^constructor|^prototype/i;

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) sanitize(item);
    return;
  }
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.test(key)) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitize(obj[key]);
    }
  }
}

module.exports = function mongoSanitize() {
  return function sanitizeMiddleware(req, _res, next) {
    sanitize(req.query);
    sanitize(req.body);
    sanitize(req.params);
    next();
  };
};
