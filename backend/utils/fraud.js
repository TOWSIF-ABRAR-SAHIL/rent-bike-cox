const FraudEvent = require('../models/FraudEvent');

const VELOCITY_WINDOWS = {
  failedPayment: { windowMs: 60 * 1000, maxCount: 3 },
  couponAbuse: { windowMs: 5 * 60 * 1000, maxCount: 5 },
  amountMismatch: { windowMs: 10 * 60 * 1000, maxCount: 2 },
  booking: { windowMs: 60 * 60 * 1000, maxCount: 5 },
};

/**
 * Resolve the caller's IP.
 *
 * Uses `req.ip`, which Express derives from the socket and the `trust proxy`
 * setting. The previous implementation read the *leftmost* X-Forwarded-For entry,
 * which is whatever the client sent — so every fraud fingerprint, recorded IP, and
 * block decision was attacker-controlled and trivially rotated away from.
 */
function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * Fingerprint for velocity checks and blocks.
 *
 * Keyed on IP alone. It used to append a phone number, but only some call sites
 * passed one — booking used `ip:<phone>` while payment used `ip:none`, so a block
 * earned in one path never applied to the other and neither could see the other's
 * event history. One key everywhere is what makes the counter meaningful.
 */
function buildFingerprint(ip) {
  return String(ip || 'unknown');
}

async function checkVelocity(fingerprint, eventType) {
  const config = VELOCITY_WINDOWS[eventType];
  if (!config) return { triggered: false };

  const since = new Date(Date.now() - config.windowMs);
  const count = await FraudEvent.countDocuments({
    fingerprint,
    eventType,
    createdAt: { $gte: since },
  });

  return {
    triggered: count >= config.maxCount,
    count,
    maxCount: config.maxCount,
    windowSeconds: config.windowMs / 1000,
  };
}

async function recordFraudEvent({ eventType, ip, phone, userId, metadata, req }) {
  const fingerprint = buildFingerprint(ip || getClientIp(req), phone);
  const severity = await computeSeverity(fingerprint, eventType);

  const event = await FraudEvent.create({
    eventType,
    fingerprint,
    userId,
    ip: ip || getClientIp(req),
    phone,
    metadata,
    severity,
    actionTaken: severity === 'critical' ? 'blocked' : severity === 'high' ? 'held' : 'flagged',
  });

  return { event, fingerprint, severity };
}

async function computeSeverity(fingerprint, eventType) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await FraudEvent.countDocuments({
    fingerprint,
    createdAt: { $gte: oneHourAgo },
  });

  if (recentCount >= 10) return 'critical';
  if (recentCount >= 5) return 'high';
  if (recentCount >= 3) return 'medium';
  return 'low';
}

async function isFingerprintBlocked(fingerprint) {
  const recent = await FraudEvent.findOne({
    fingerprint,
    severity: 'critical',
    actionTaken: 'blocked',
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  }).lean();
  return !!recent;
}

/**
 * Fraud event summary.
 *
 * Takes an options object: the admin report called this as `({ startDate, endDate })`
 * against the old `(ip, phone, hours)` signature, so `query.ip` was set to that
 * object and always matched nothing — the fraud report was permanently empty.
 *
 * @param {{ip?: string, phone?: string, hours?: number, startDate?: Date|string, endDate?: Date|string}} [options]
 */
async function getVelocityReport({ ip, phone, hours = 1, startDate, endDate } = {}) {
  const since = startDate ? new Date(startDate) : new Date(Date.now() - hours * 60 * 60 * 1000);
  const query = { createdAt: endDate ? { $gte: since, $lte: new Date(endDate) } : { $gte: since } };
  if (ip) query.ip = ip;
  if (phone) query.phone = phone;

  const events = await FraudEvent.find(query).sort({ createdAt: -1 }).lean();
  const byType = {};
  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] || 0) + 1;
  }

  return { total: events.length, byType, events: events.slice(0, 20) };
}

module.exports = {
  checkVelocity,
  recordFraudEvent,
  isFingerprintBlocked,
  getVelocityReport,
  getClientIp,
  buildFingerprint,
};
