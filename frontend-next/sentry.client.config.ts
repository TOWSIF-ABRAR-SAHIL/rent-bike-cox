import * as Sentry from "@sentry/nextjs";

// Inert unless NEXT_PUBLIC_SENTRY_DSN is set — no Sentry account needed
// for local dev or for builds that don't report errors.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.05,
});
