const mongoose = require('mongoose');
const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const { generateRefundId } = require('../utils/generators');
const { calculateRefundWithBreaker } = require('../utils/refund');
const { roundPaisa } = require('../utils/safeAmount');
const { createJournalEntry } = require('../utils/ledger');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class RefundService {
  async requestRefund({ bookingId, reason, userId, correlationId }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'Confirmed') throw new Error('Only confirmed bookings can be refunded');
    if (booking.advancePaid <= 0) throw new Error('No advance paid — nothing to refund');

    const existing = await Refund.findOne({
      bookingId,
      status: { $in: ['REQUESTED', 'APPROVED', 'PROCESSING'] },
    });
    if (existing) throw new Error('A refund is already in progress for this booking');

    const refundCalc = await calculateRefundWithBreaker(booking);
    const refundId = await generateRefundId();

    const refund = await Refund.create({
      refundId,
      bookingId,
      userId,
      amountPaisa: refundCalc.refundableAmount,
      reason,
      status: 'REQUESTED',
      cancellationType: refundCalc.refundPercent === 100 ? 'full' : refundCalc.refundPercent === 50 ? 'partial' : 'none',
      hoursBeforeStart: refundCalc.hoursUntilPickup,
      refundPercentage: refundCalc.refundPercent,
      correlationId,
    });

    bus.emit('refund.requested', { refundId, bookingId, amount: refundCalc.refundableAmount, correlationId });
    logger.info('Refund requested', { refundId, bookingId, amount: refundCalc.refundableAmount });

    return { refund, refundCalc };
  }

  async approveRefund({ refundId, approvedBy }) {
    const refund = await Refund.findOne({ refundId });
    if (!refund) throw new Error('Refund not found');
    if (refund.status !== 'REQUESTED') throw new Error(`Cannot approve refund in status: ${refund.status}`);

    refund.status = 'APPROVED';
    refund.approvedBy = approvedBy;
    await refund.save();

    bus.emit('refund.approved', { refundId, approvedBy });
    logger.info('Refund approved', { refundId, approvedBy });

    return refund;
  }

  async rejectRefund({ refundId, approvedBy, reason }) {
    const refund = await Refund.findOne({ refundId });
    if (!refund) throw new Error('Refund not found');
    if (refund.status !== 'REQUESTED') throw new Error(`Cannot reject refund in status: ${refund.status}`);

    refund.status = 'REJECTED';
    refund.approvedBy = approvedBy;
    refund.reason = reason || refund.reason;
    await refund.save();

    bus.emit('refund.rejected', { refundId, approvedBy, reason });
    logger.info('Refund rejected', { refundId, approvedBy, reason });

    return refund;
  }

  async processRefund({ refundId, processedBy, correlationId }) {
    const refund = await Refund.findOne({ refundId }).populate('bookingId');
    if (!refund) throw new Error('Refund not found');
    if (refund.status !== 'APPROVED') throw new Error(`Cannot process refund in status: ${refund.status}`);

    refund.status = 'PROCESSING';
    await refund.save();

    if (refund.amountPaisa > 0) {
      const { recordRefund } = require('../utils/circuitBreaker');
      await recordRefund(refund.amountPaisa);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Booking.findByIdAndUpdate(refund.bookingId._id, {
          $set: {
            status: 'Cancelled',
            refundAmount: refund.amountPaisa,
            refundDate: new Date(),
            cancellationAt: new Date(),
            paymentStatus: refund.amountPaisa >= refund.bookingId.advancePaid ? 'Refunded' : 'Partial',
          },
          $push: {
            refundIds: refund._id,
          },
        }, { session });

        if (refund.amountPaisa > 0) {
          await createJournalEntry({
            bookingId: refund.bookingId._id,
            source: 'refund',
            reference: refundId,
            entries: [
              { type: 'debit', account: 'refund_liability', amount: refund.amountPaisa, description: `Refund: ${refund.reason}` },
              { type: 'credit', account: 'advance_paid', amount: refund.amountPaisa, description: `Refund processed for ${refundId}` },
            ],
          });
        }

        refund.status = 'COMPLETED';
        refund.completedAt = new Date();
        await refund.save({ session });
      });
    } finally {
      await session.endSession();
    }

    bus.emit('refund.completed', { refundId, bookingId: refund.bookingId._id.toString(), amount: refund.amountPaisa, correlationId });
    logger.info('Refund processed', { refundId, amount: refund.amountPaisa });

    return refund;
  }

  async getRefundsForBooking(bookingId) {
    return Refund.find({ bookingId }).sort({ createdAt: -1 });
  }

  async getPendingRefunds() {
    return Refund.find({ status: 'REQUESTED' }).sort({ createdAt: 1 });
  }
}

module.exports = new RefundService();
