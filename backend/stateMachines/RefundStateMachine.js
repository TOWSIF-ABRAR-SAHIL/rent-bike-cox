const { RefundStatus, RefundTransition } = require('../domain/enums');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class RefundStateMachine {
  static canTransition(from, to) {
    const allowed = RefundTransition[from];
    return allowed ? allowed.includes(to) : false;
  }

  static async transition(refund, toStatus, { actor, reason } = {}) {
    const fromStatus = refund.status;

    if (!this.canTransition(fromStatus, toStatus)) {
      const err = new Error(`Invalid refund transition: ${fromStatus} → ${toStatus}`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    const Refund = require('../models/Refund');
    const update = { status: toStatus };
    if (toStatus === RefundStatus.COMPLETED) update.completedAt = new Date();
    if (toStatus === RefundStatus.PROCESSING) update.processedAt = new Date();
    if (actor) update.approvedBy = actor;

    await Refund.findByIdAndUpdate(refund._id, { $set: update });

    bus.emit('refund.stateChanged', {
      refundId: refund.refundId,
      from: fromStatus,
      to: toStatus,
      actor: actor?.toString(),
      reason,
    });

    logger.info('Refund state transition', {
      refundId: refund.refundId,
      from: fromStatus,
      to: toStatus,
    });
  }
}

module.exports = RefundStateMachine;
