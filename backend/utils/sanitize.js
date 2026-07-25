const { sanitizeHtml, sanitizeObject: domSanitizeObject } = require('../security/sanitizers/domSanitizer');

function sanitize(str) {
  return sanitizeHtml(str);
}

function sanitizeFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  }
  return sanitized;
}

module.exports = { sanitize, sanitizeFields };
