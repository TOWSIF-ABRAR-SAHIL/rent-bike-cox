const {
  sanitizeHtml,
  sanitizeEmailHtml,
  sanitizeObject: domSanitizeObject,
} = require('../security/sanitizers/domSanitizer');

function sanitize(str) {
  return sanitizeHtml(str);
}

/**
 * Sanitize content that is intentionally HTML (email templates, campaign bodies).
 * `sanitize` is correct for user-supplied text but allows no tags at all, so using
 * it on an email body silently destroyed the template's markup on save.
 */
function sanitizeEmail(str) {
  return sanitizeEmailHtml(str);
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

/**
 * Escape a user-supplied string for safe use inside a MongoDB `$regex`.
 *
 * Several controllers passed raw query params straight into `$regex`, so a query
 * like `?q=(a+)+$` reached the engine as a regular expression — a cheap way to pin
 * a CPU on catastrophic backtracking. Controllers that escaped did so inline; this
 * is the shared version.
 */
function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { sanitize, sanitizeEmail, sanitizeFields, escapeRegex };
