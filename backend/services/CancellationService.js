const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { releaseBikeLock } = require('../utils/bookingLock');
const { calculateRefundWithBreaker } = require('../utils/refund');
const { createJournalEntry } = require('../utils/ledger');
const { roundPaisa } = require('../utils/safeAmount');
const RefundService = require('./RefundService');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class CancellationService {
  async calculateRefund(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status === 'Cancelled') throw new Error('Booking already cancelled');
    if (booking.status === 'Completed') throw new Error('Cannot cancel completed booking');
    return calculateRefundWithBreaker(booking);
  }

  async executeCancellation({ bookingId, reason, userId, correlationId }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status === 'Cancelled' || booking.status === 'Completed') {
      throw new Error(`Cannot cancel booking in status: ${booking.status}`);
    }

    const refundResult = await calculateRefundWithBreaker(booking);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const prevStatus = booking.status;

        await Booking.findByIdAndUpdate(bookingId, {
          $set: {
            status: 'Cancelled',
            cancellationAt: new Date(),
            cancellationReason: reason,
            refundAmount: refundResult.refundableAmount,
            refundDate: refundResult.refundableAmount > 0 ? new Date() : undefined,
            paymentStatus: refundResult.refundableAmount >= booking.advancePaid ? 'Refunded' : booking.paymentStatus,
            state: 'CANCELLED',
          },
          $push: {
            stateHistory: {
              from: prevStatus,
              to: 'Cancelled',
              at: new Date(),
              actor: userId,
              reason,
            },
          },
        }, { session });

        if (booking.advancePaid > 0 && refundResult.refundableAmount > 0) {
          const { recordRefund } = require('../utils/circuitBreaker');
          await recordRefund(refundResult.refundableAmount);

          await createJournalEntry({
            bookingId: booking._id,
            source: 'cancellation',
            reference: `cancel-${bookingId}`,
            entries: [
              { type: 'debit', account: 'refund_liability', amount: refundResult.refundableAmount, description: `Cancellation refund: ${reason}` },
              { type: 'credit', account: 'advance_paid', amount: refundResult.refundableAmount, description: `Refund for cancelled booking` },
            ],
          });
        }

        const hasActive = await Booking.exists({
          bike: booking.bike,
          status: { $in: ['Pending', 'Confirmed'] },
          _id: { $ne: bookingId },
        }).session(session);
        if (!hasActive) {
          await require('../models/Bike').findByIdAndUpdate(booking.bike, { $set: { availability: true } }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    if (booking.couponApplied) {
      const Coupon = require('../models/Coupon');
      await Coupon.findByIdAndUpdate(booking.couponApplied, {
        $inc: { usedCount: -1 },
        $pull: { usedBy: { user: userId } },
      }).catch(() => {});
    }

    bus.emit('booking.cancelled', {
      bookingId,
      reason,
      refundAmount: refundResult.refundableAmount,
      penaltyReason: refundResult.penaltyReason,
      correlationId,
    });

    logger.info('Booking cancelled', { bookingId, reason, refundAmount: refundResult.refundableAmount });

    return {
      cancelled: true,
      refundAmount: refundResult.refundableAmount,
      penaltyReason: refundResult.penaltyReason,
      refundPercent: refundResult.refundPercent,
    };
  }

  async notifyStakeholders({ bookingId, event }) {
    logger.info(`[Notification] ${event} for booking ${bookingId} — placeholder`);
  }
}

module.exports = new CancellationService();
