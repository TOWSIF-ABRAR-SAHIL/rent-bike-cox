const logger = require('../utils/logger');

function jobLogger(name) {
  const start = Date.now();
  logger.info(`Job started: ${name}`);
  return {
    done(result) {
      const duration = Date.now() - start;
      logger.info(`Job completed: ${name}`, { duration, ...result });
    },
    error(err) {
      const duration = Date.now() - start;
      logger.error(`Job failed: ${name}`, { duration, error: err.message });
    },
  };
}

module.exports = jobLogger;
