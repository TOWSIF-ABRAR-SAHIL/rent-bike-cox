const { roundPaisa, percentOf, subtractPaisa, multiplyPaisa, dividePaisa } = require('./safeAmount');
const { checkCircuitBreaker, recordRefund } = require('./circuitBreaker');

/**
 * Calculate refund amount based on time-to-pickup and rental progress.
 *
 * Policy:
 *   > 24 hours before startTime  → 100% refund
 *   12–24 hours before startTime → 50% refund
 *   < 12 hours before startTime  → 0% refund (no refund)
 *   Past startTime (no-show)     → 0% refund
 *   In-progress rental           → pro-rata deduction for time already used
 */
async function calculateRefund(booking) {
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const msUntilPickup = startTime - now;
  const hoursUntilPickup = msUntilPickup / (1000 * 60 * 60);

  const rentalDurationMs = endTime - startTime;
  const elapsedMs = now - startTime;
  const rentalHours = rentalDurationMs / (1000 * 60 * 60);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const rentalProgress = Math.min(1, Math.max(0, dividePaisa(elapsedMs, rentalDurationMs)));

  let baseRefundPercent;
  let penaltyReason;

  if (hoursUntilPickup <= 0) {
    if (elapsedHours >= rentalHours) {
      baseRefundPercent = 0;
      penaltyReason = 'No refund — rental period has ended';
    } else if (rentalProgress > 0 && rentalProgress < 1) {
      const usedFraction = roundPaisa(rentalProgress * 100);
      baseRefundPercent = Math.max(0, 100 - usedFraction);
      penaltyReason = `Pro-rata deduction — ${usedFraction}% of rental period used`;
    } else {
      baseRefundPercent = 0;
      penaltyReason = 'No refund — rental start time has passed (no-show)';
    }
  } else if (hoursUntilPickup < 12) {
    baseRefundPercent = 0;
    penaltyReason = 'No refund — cancelled less than 12 hours before pickup';
  } else if (hoursUntilPickup < 24) {
    baseRefundPercent = 50;
    penaltyReason = '50% refund — cancelled between 12–24 hours before pickup';
  } else {
    baseRefundPercent = 100;
    penaltyReason = 'Full refund — cancelled more than 24 hours before pickup';
  }

  const refundableAmount = percentOf(booking.advancePaid, baseRefundPercent);

  return {
    refundPercent: baseRefundPercent,
    refundableAmount: roundPaisa(refundableAmount),
    penaltyReason,
    hoursUntilPickup: Math.max(0, roundPaisa(hoursUntilPickup)),
    rentalProgress: roundPaisa(rentalProgress * 100),
  };
}

async function calculateRefundWithBreaker(booking) {
  const refund = await calculateRefund(booking);

  if (refund.refundableAmount > 0) {
    const breaker = await checkCircuitBreaker();
    if (!breaker.allowed) {
      return {
        ...refund,
        refundableAmount: 0,
        penaltyReason: `Refund blocked — ${breaker.reason}`,
        circuitBreakerTripped: true,
        breakerStatus: breaker,
      };
    }
    if (refund.refundableAmount > breaker.remaining) {
      const cappedAmount = breaker.remaining;
      return {
        ...refund,
        refundableAmount: cappedAmount,
        penaltyReason: `${refund.penaltyReason} (circuit breaker: capped at ${cappedAmount} TK, ${breaker.remaining} TK remaining today)`,
        circuitBreakerCapped: true,
        breakerStatus: breaker,
      };
    }
  }

  return refund;
}

async function processRefund(booking, refundAmount) {
  if (refundAmount > 0) {
    await recordRefund(refundAmount);
  }
}

module.exports = { calculateRefund, calculateRefundWithBreaker, processRefund };
