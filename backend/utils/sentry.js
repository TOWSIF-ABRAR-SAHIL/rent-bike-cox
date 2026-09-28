'use strict';

/**
 * Sentry wrapper — completely inert unless SENTRY_DSN is set.
 *
 * PII discipline: only correlationId/method/url are attached. Never pass the
 * raw req object to captureException (headers carry Bearer tokens).
 */

let Sentry = null;
let enabled = false;

function init() {
  if (enabled || !process.env.SENTRY_DSN) return;
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.05,
    });
    enabled = true;
  } catch {
    Sentry = null;
  }
}

function reportServerError(err, req) {
  if (!enabled || !Sentry) return;
  try {
    Sentry.withScope((scope) => {
      if (req?.correlationId) scope.setTag('correlationId', req.correlationId);
      scope.setExtra('method', req?.method);
      scope.setExtra('url', req?.originalUrl || req?.url);
      Sentry.captureException(err);
    });
  } catch {
    // Reporting must never break the error path itself.
  }
}

function isEnabled() {
  return enabled;
}

module.exports = { init, reportServerError, isEnabled };
