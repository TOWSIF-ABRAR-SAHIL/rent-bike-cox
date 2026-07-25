const { v4: uuidv4 } = require('uuid');
const { withCorrelation } = require('../utils/logger');

function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  req.log = withCorrelation(id);
  next();
}

module.exports = correlationId;
