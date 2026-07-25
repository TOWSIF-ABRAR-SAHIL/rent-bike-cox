const corsConfig = {
  development: {
    origins: [
      process.env.FRONTEND_URL,
      'https://rent-bike-cox.vercel.app',
      'http://localhost:5173',
      'https://sandbox.sslcommerz.com',
      'https://sslcommerz.com',
    ].filter(Boolean),
    credentials: true,
  },
  production: {
    origins: [
      process.env.FRONTEND_URL,
      'https://rent-bike-cox.vercel.app',
      'https://sandbox.sslcommerz.com',
      'https://sslcommerz.com',
    ].filter(Boolean),
    credentials: true,
  },
};

function getCorsOptions() {
  const env = process.env.NODE_ENV || 'development';
  const config = corsConfig[env] || corsConfig.development;

  return {
    origin: (origin, callback) => {
      if (!origin || config.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Idempotency-Key'],
    maxAge: 86400,
  };
}

module.exports = { getCorsOptions, corsConfig };
