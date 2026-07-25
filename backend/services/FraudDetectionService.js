const FraudEvent = require('../models/FraudEvent');
const { checkVelocity, recordFraudEvent, getClientIp, isFingerprintBlocked, buildFingerprint, getVelocityReport } = require('../utils/fraud');
const AuditLog = require('../models/AuditLog');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class FraudDetectionService {
  async runFraudChecks({ bookingId, userId, ip, amountPaisa, bikePricePerHour, accountAge, correlationId }) {
    const results = { score: 0, flags: [], decision: 'ALLOW', checks: [] };
    const fingerprint = buildFingerprint(ip, null);

    const blocked = await isFingerprintBlocked(fingerprint);
    if (blocked) {
      results.score = 100;
      results.flags.push('BLOCKED_FINGERPRINT');
      results.decision = 'BLOCK';
      results.checks.push({ check: 'fingerprint_block', passed: false, score: 100 });
      return results;
    }

    const velocity = await checkVelocity(fingerprint, 'booking');
    if (velocity.triggered) {
      results.score += 40;
      results.flags.push('VELOCITY_EXCEEDED');
      results.checks.push({ check: 'velocity', passed: false, score: 40, count: velocity.count });
    }

    if (amountPaisa > 500000) {
      results.score += 25;
      results.flags.push('HIGH_AMOUNT');
      results.checks.push({ check: 'high_amount', passed: false, score: 25 });
    }

    if (accountAge !== undefined && accountAge < 24 && amountPaisa > 500000) {
      results.score += 20;
      results.flags.push('NEW_ACCOUNT_HIGH_AMOUNT');
      results.checks.push({ check: 'new_account_high_amount', passed: false, score: 20 });
    }

    if (ip) {
      const hour = new Date().getHours();
      if (hour >= 2 && hour <= 5) {
        results.score += 10;
        results.flags.push('UNUSUAL_HOUR');
        results.checks.push({ check: 'unusual_hour', passed: false, score: 10 });
      }
    }

    if (results.score >= 80) results.decision = 'BLOCK';
    else if (results.score >= 50) results.decision = 'REVIEW';
    else results.decision = 'ALLOW';

    if (results.decision !== 'ALLOW') {
      await recordFraudEvent({
        eventType: 'fraud_check',
        userId,
        ip,
        metadata: { bookingId, amountPaisa, score: results.score, flags: results.flags, decision: results.decision },
        correlationId,
      });

      await AuditLog.create({
        action: 'FRAUD_DETECTED',
        actorId: userId,
        resourceId: bookingId,
        after: results,
        ip,
        correlationId,
      });

      bus.emit('fraud.detected', { bookingId, userId, score: results.score, decision: results.decision, flags: results.flags, correlationId });
    }

    logger.info('Fraud check complete', { bookingId, score: results.score, decision: results.decision, flags: results.flags });
    return results;
  }

  async getReport({ startDate, endDate }) {
    return getVelocityReport({ startDate, endDate });
  }

  async getEvents({ page = 1, limit = 50, severity }) {
    const query = {};
    if (severity) query.severity = severity;
    return FraudEvent.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  }
}

module.exports = new FraudDetectionService();
