const FraudEvent = require('../models/FraudEvent');

const VELOCITY_WINDOWS = {
  failedPayment: { windowMs: 60 * 1000, maxCount: 3 },
  couponAbuse: { windowMs: 5 * 60 * 1000, maxCount: 5 },
  amountMismatch: { windowMs: 10 * 60 * 1000, maxCount: 2 },
};

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
}

function buildFingerprint(ip, phone) {
  return `${ip}:${phone || 'none'}`;
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

async function getVelocityReport(ip, phone, hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const query = { createdAt: { $gte: since } };
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
