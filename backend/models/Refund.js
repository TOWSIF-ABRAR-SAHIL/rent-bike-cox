const mongoose = require('mongoose');
const { RefundStatus } = require('../domain/enums');

const refundSchema = new mongoose.Schema({
  refundId: { type: String, required: true, unique: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  intentId: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaisa: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  reason: { type: String, required: true },
  status: { type: String, enum: Object.values(RefundStatus), default: RefundStatus.REQUESTED },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  completedAt: Date,
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  cancellationType: { type: String },
  hoursBeforeStart: Number,
  refundPercentage: Number,
  correlationId: String,
}, { timestamps: true });

refundSchema.index({ status: 1, createdAt: 1 });
refundSchema.index({ bookingId: 1, status: 1 });

const VALID_TRANSITIONS = {
  [RefundStatus.REQUESTED]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
  [RefundStatus.APPROVED]: [RefundStatus.PROCESSING, RefundStatus.REJECTED],
  [RefundStatus.PROCESSING]: [RefundStatus.COMPLETED],
  [RefundStatus.COMPLETED]: [],
  [RefundStatus.REJECTED]: [],
};

refundSchema.pre('save', function () {
  if (this.isModified('status') && !this.isNew) {
    const prev = this._prevStatus || this.status;
    const allowed = VALID_TRANSITIONS[prev] || [];
    if (!allowed.includes(this.status)) {
      throw new Error(`Invalid refund transition: ${prev} → ${this.status}`);
    }
  }
});

refundSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.status) {
    const doc = await this.model.findOne(this.getQuery()).lean();
    if (doc) {
      const allowed = VALID_TRANSITIONS[doc.status] || [];
      if (!allowed.includes(update.$set.status)) {
        throw new Error(`Invalid refund transition: ${doc.status} → ${update.$set.status}`);
      }
    }
  }
});

module.exports = mongoose.model('Refund', refundSchema);
