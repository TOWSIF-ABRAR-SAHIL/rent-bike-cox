import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.5,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
    });
    window.__SENTRY__ = Sentry;
  });
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  if (window.__SENTRY__) {
    window.__SENTRY__.captureException(event.reason);
  }
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
  if (window.__SENTRY__) {
    window.__SENTRY__.captureException(event.error);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
