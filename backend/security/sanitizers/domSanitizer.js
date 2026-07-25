const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const sanitizeConfig = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return dirty;
  return purify.sanitize(dirty, sanitizeConfig);
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clean)) {
    if (typeof clean[key] === 'string') {
      clean[key] = sanitizeHtml(clean[key]);
    } else if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = sanitizeObject(clean[key]);
    }
  }
  return clean;
}

module.exports = { sanitizeHtml, sanitizeObject };
