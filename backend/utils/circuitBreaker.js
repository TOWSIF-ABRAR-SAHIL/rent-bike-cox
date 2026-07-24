const CircuitBreaker = require('../models/CircuitBreaker');
const { roundPaisa } = require('./safeAmount');

const DEFAULT_DAILY_CAP = 50000;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function checkCircuitBreaker(dailyCap) {
  const today = getTodayKey();
  const cap = dailyCap || DEFAULT_DAILY_CAP;

  let breaker = await CircuitBreaker.findOne({ date: today });
  if (!breaker) {
    breaker = await CircuitBreaker.create({
      date: today,
      dailyRefundCap: cap,
      totalRefunded: 0,
      refundCount: 0,
      isTripped: false,
    });
  }

  if (breaker.isTripped) {
    return {
      allowed: false,
      reason: 'Circuit breaker tripped — daily refund cap exceeded. Contact admin.',
      totalRefunded: breaker.totalRefunded,
      cap: breaker.dailyRefundCap,
      refundCount: breaker.refundCount,
    };
  }

  if (breaker.totalRefunded >= cap) {
    breaker.isTripped = true;
    breaker.trippedAt = new Date();
    breaker.trippedBy = 'system';
    await breaker.save();

    console.error(`[CircuitBreaker] TRIPPED — daily cap ${cap} TK reached (${breaker.totalRefunded} TK refunded across ${breaker.refundCount} refunds)`);
    return {
      allowed: false,
      reason: 'Circuit breaker tripped — daily refund cap exceeded. Contact admin.',
      totalRefunded: breaker.totalRefunded,
      cap: breaker.dailyRefundCap,
      refundCount: breaker.refundCount,
    };
  }

  return {
    allowed: true,
    totalRefunded: breaker.totalRefunded,
    remaining: roundPaisa(cap - breaker.totalRefunded),
    cap: breaker.dailyRefundCap,
    refundCount: breaker.refundCount,
  };
}

async function recordRefund(amount) {
  const today = getTodayKey();
  const result = await CircuitBreaker.findOneAndUpdate(
    { date: today },
    {
      $inc: { totalRefunded: Math.round(amount), refundCount: 1 },
      $setOnInsert: { dailyRefundCap: DEFAULT_DAILY_CAP, isTripped: false },
    },
    { new: true, upsert: true }
  );

  if (result.totalRefunded >= result.dailyRefundCap && !result.isTripped) {
    result.isTripped = true;
    result.trippedAt = new Date();
    result.trippedBy = 'system';
    await result.save();
    console.error(`[CircuitBreaker] TRIPPED — cap ${result.dailyRefundCap} TK exceeded by refund of ${amount} TK`);
  }

  return result;
}

async function unlockCircuitBreaker(adminId) {
  const today = getTodayKey();
  return CircuitBreaker.findOneAndUpdate(
    { date: today, isTripped: true },
    {
      $set: {
        isTripped: false,
        unlockedBy: adminId,
        unlockedAt: new Date(),
      },
    },
    { new: true }
  );
}

async function getCircuitBreakerStatus() {
  const today = getTodayKey();
  const breaker = await CircuitBreaker.findOne({ date: today }).lean();
  if (!breaker) {
    return {
      date: today,
      isTripped: false,
      totalRefunded: 0,
      refundCount: 0,
      remaining: DEFAULT_DAILY_CAP,
      cap: DEFAULT_DAILY_CAP,
    };
  }
  return {
    date: today,
    isTripped: breaker.isTripped,
    totalRefunded: breaker.totalRefunded,
    refundCount: breaker.refundCount,
    remaining: Math.max(0, breaker.dailyRefundCap - breaker.totalRefunded),
    cap: breaker.dailyRefundCap,
    trippedAt: breaker.trippedAt,
  };
}

module.exports = { checkCircuitBreaker, recordRefund, unlockCircuitBreaker, getCircuitBreakerStatus };
