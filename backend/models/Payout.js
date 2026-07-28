const mongoose = require('mongoose');
const { PayoutStatus } = require('../domain/enums');

const payoutSchema = new mongoose.Schema({
  payoutId: { type: String, required: true, unique: true },
  renterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmountPaisa: { type: Number, required: true },
  platformFeePaisa: { type: Number, required: true },
  netAmountPaisa: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  status: { type: String, enum: Object.values(PayoutStatus), default: PayoutStatus.PENDING },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  bookingCount: { type: Number, default: 0 },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  paymentReference: String,
  notes: String,
  correlationId: String,
}, { timestamps: true });

payoutSchema.index({ renterId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
