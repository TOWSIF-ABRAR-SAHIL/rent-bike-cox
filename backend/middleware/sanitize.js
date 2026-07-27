// Express 5 compatible replacement for express-mongo-sanitize
// Express 5 made req.query a read-only getter, so the library's
// approach of reassigning req.query / req.body / req.params no longer works.

const keys = ['__proto__', 'constructor', 'prototype'];

function sanitize(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        delete obj[key];
      }
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
