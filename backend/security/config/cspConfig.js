const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    connectSrc: [
      "'self'",
      process.env.FRONTEND_URL,
      'https://sandbox.sslcommerz.com',
      'https://sslcommerz.com',
    ].filter(Boolean),
    frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
};

module.exports = cspConfig;
