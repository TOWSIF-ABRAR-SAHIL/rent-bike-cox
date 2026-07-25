const winston = require('winston');

const SENSITIVE_FIELDS = [
  'password', 'token', 'cvv', 'nid', 'license', 'secret', 'authorization',
  'card_number', 'pan', 'cc', 'account_number', 'bank_account',
  'ssn', 'email', 'phone', 'phonenumber', 'access_token', 'refresh_token',
];

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      clean[key] = '[REDACTED]';
    } else if (typeof clean[key] === 'object' && clean[key] !== null) {
      clean[key] = redact(clean[key]);
    }
  }
  return clean;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'rentbike' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
              const cid = correlationId ? ` [${correlationId}]` : '';
              const extra = Object.keys(meta).length > 1 ? ' ' + JSON.stringify(redact(meta)) : '';
              return `${timestamp} ${level}${cid}: ${message}${extra}`;
            })
          ),
    }),
    new winston.transports.File({
      filename: 'server-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => JSON.stringify(redact(info)))
      ),
    }),
    new winston.transports.File({
      filename: 'server.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => JSON.stringify(redact(info)))
      ),
    }),
  ],
});

function withCorrelation(correlationId) {
  return logger.child({ correlationId });
}

module.exports = logger;
module.exports.withCorrelation = withCorrelation;
module.exports.redact = redact;
