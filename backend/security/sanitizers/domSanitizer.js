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

/**
 * Sanitizer for content that is *meant* to be HTML: email templates and campaign
 * bodies. `sanitizeHtml` allows no tags at all, which is right for user-supplied
 * text but silently flattened every admin-authored email template to bare text on
 * save — the seeded templates are full of <p>/<h2>/<strong> markup.
 *
 * Scripts, event handlers, and javascript: URLs are still stripped by DOMPurify.
 */
const emailConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'small',
    'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'pre', 'code',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'width', 'height', 'align', 'valign',
    'style', 'target', 'rel', 'colspan', 'rowspan', 'border', 'cellpadding',
    'cellspacing', 'bgcolor',
  ],
  ALLOW_DATA_ATTR: false,
};

function sanitizeEmailHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return dirty;
  return purify.sanitize(dirty, emailConfig);
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

module.exports = { sanitizeHtml, sanitizeEmailHtml, sanitizeObject };
