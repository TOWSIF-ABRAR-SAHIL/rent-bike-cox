/**
 * Strip HTML tags and trim whitespace from a string.
 * Defense-in-depth against stored XSS (React escapes by default, but this is safer).
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize an object's string fields recursively.
 * Returns a new object with sanitized values.
 */
function sanitizeFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitize(sanitized[field]);
    }
  }
  return sanitized;
}

module.exports = { sanitize, sanitizeFields };
