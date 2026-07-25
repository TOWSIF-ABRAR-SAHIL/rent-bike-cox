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
  res.setHeader('X-Correlation-Id', id);
  req.log = withCorrelation(id);
  next();
}

module.exports = correlationId;
