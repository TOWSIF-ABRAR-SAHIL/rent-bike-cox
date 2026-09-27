/**
 * The one rule this module exists to enforce: a message reaches a response body
 * only when we wrote it ourselves.
 *
 * `err.message` is not safe to send. It carries whatever the failing layer decided
 * to say — mongoose echoes the Atlas hostname and the collection/index it hit
 * ("E11000 duplicate key error collection: rentbike.users index: email_1"),
 * drivers echo connection strings, axios echoes full URLs, SMTP echoes the relay
 * and often the credentials it rejected. None of that belongs in an HTTP body.
 *
 * So: throw `HttpError` when you author a message a caller should read; everything
 * else is logged with its correlation id and answered with canned text.
 */

/**
 * A symbol, not a plain property. The obvious name for this flag is `expose`, and
 * `http-errors` — the package behind body-parser and express's own 4xx errors —
 * already sets `expose: true` on every client error it builds. A boolean property is
 * therefore not ownership: trusting it let body-parser's raw parse text
 * ("Unexpected token '\"', ...") straight back into the response. Nothing outside this
 * module can set a symbol it cannot name.
 */
const CLIENT_FACING = Symbol('rentbike.clientFacingError');

class HttpError extends Error {
  /**
   * @param {number} status HTTP status to answer with.
   * @param {string} message Text authored here — safe to show the caller.
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this[CLIENT_FACING] = true;
    if (options.code) this.code = options.code;
  }
}

/** True only for errors built by this module. */
function isClientFacing(err) {
  return Boolean(err && err[CLIENT_FACING] === true);
}

const STATUS_TEXT = {
  400: 'Invalid request',
  401: 'Unauthorized',
  402: 'Payment required',
  403: 'Forbidden',
  404: 'Not found',
  405: 'Method not allowed',
  406: 'Not acceptable',
  408: 'Request timeout',
  409: 'Conflicting request',
  410: 'Gone',
  413: 'Payload too large',
  415: 'Unsupported media type',
  422: 'Invalid request data',
  429: 'Too many requests',
};

/** Canned text for a status, so a rejection answers without repeating a library's words. */
function statusMessage(status) {
  return STATUS_TEXT[status] || (status >= 500 ? 'Internal server error' : 'Request rejected');
}

/**
 * Messages authored by our own schemas are also safe: they name a field and the
 * constraint it broke ("Path `expiryDate` is required."), never a host or a
 * collection. A CastError is deliberately excluded — mongoose writes those, and
 * they name the model and the rejected value's type.
 */
function validationMessage(err) {
  if (!err || err.name !== 'ValidationError' || !err.errors) return null;
  const messages = Object.values(err.errors)
    .map(e => (e && typeof e.message === 'string' ? e.message : null))
    .filter(Boolean);
  return messages.length ? messages.join('; ') : null;
}

/** What a controller may send back: our own message, or a schema's — never a driver's. */
function clientMessage(err, fallback) {
  if (isClientFacing(err) && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return validationMessage(err) || fallback;
}

/**
 * The status to answer with. Only an exposed error may choose its own status, and
 * only within the 4xx range a caller can act on — an internal failure must never
 * be able to label itself a 2xx or leak a 5xx it invented.
 */
function clientStatus(err, fallback = 400) {
  if (isClientFacing(err) && typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    return err.status;
  }
  return fallback;
}

module.exports = { HttpError, isClientFacing, statusMessage, validationMessage, clientMessage, clientStatus };
