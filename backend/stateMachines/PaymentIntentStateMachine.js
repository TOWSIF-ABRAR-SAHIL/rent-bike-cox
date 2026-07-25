const { TransactionStatus } = require('../domain/enums');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

const TRANSITIONS = {
  [TransactionStatus.INITIATED]: [TransactionStatus.PROCESSING, TransactionStatus.CANCELLED],
  [TransactionStatus.PROCESSING]: [TransactionStatus.SUCCEEDED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
  [TransactionStatus.SUCCEEDED]: [],
  [TransactionStatus.FAILED]: [TransactionStatus.INITIATED],
  [TransactionStatus.CANCELLED]: [],
  [TransactionStatus.EXPIRED]: [],
  [TransactionStatus.PENDING_VERIFICATION]: [TransactionStatus.SUCCEEDED, TransactionStatus.FAILED],
};

class PaymentIntentStateMachine {
  static canTransition(from, to) {
    const allowed = TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static async transition(intent, toStatus, { reason, metadata } = {}) {
    const fromStatus = intent.status;

    if (!this.canTransition(fromStatus, toStatus)) {
      const err = new Error(`Invalid payment intent transition: ${fromStatus} → ${toStatus}`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    const PaymentIntent = require('../models/PaymentIntent');
    const update = { status: toStatus };
    if (toStatus === TransactionStatus.SUCCEEDED) update.completedAt = new Date();

    await PaymentIntent.findByIdAndUpdate(intent._id, {
      $set: update,
      $push: {
        attempts: {
          status: toStatus,
          error: reason || undefined,
          attemptedAt: new Date(),
          completedAt: toStatus === TransactionStatus.SUCCEEDED ? new Date() : undefined,
        },
      },
    });

    bus.emit('paymentIntent.stateChanged', {
      intentId: intent.intentId,
      from: fromStatus,
      to: toStatus,
      reason,
      metadata,
    });

    logger.info('Payment intent state transition', {
      intentId: intent.intentId,
      from: fromStatus,
      to: toStatus,
    });
  }
}

module.exports = PaymentIntentStateMachine;
