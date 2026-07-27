const logger = require('./logger');

let isShuttingDown = false;

function gracefulShutdown(server, mongoose, options = {}) {
  const timeout = options.timeout || 10000;

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown`, { signal, timeout });

    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown — timeout exceeded', { timeout });
      process.exit(1);
    }, timeout);
    if (forceExit.unref) forceExit.unref();

    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      if (mongoose && mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    } catch (err) {
      logger.error('Error closing MongoDB', { error: err.message });
    }

    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

module.exports = gracefulShutdown;
