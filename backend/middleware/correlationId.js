const { v4: uuidv4 } = require('uuid');
const { withCorrelation } = require('../utils/logger');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CORRELATION_LENGTH = 128;

function correlationId(req, res, next) {
  let id = req.headers['x-correlation-id'];
  if (id && typeof id === 'string' && id.length <= MAX_CORRELATION_LENGTH && UUID_REGEX.test(id)) {
    id = id.toLowerCase();
  } else {
    id = uuidv4();
  }
  req.correlationId = id;
  res.setHeader('X-Request-Id', id);
  req.log = withCorrelation(id);

  req._startTime = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    req._duration = Date.now() - req._startTime;
    originalEnd.apply(this, args);
  };

  next();
}

module.exports = correlationId;
