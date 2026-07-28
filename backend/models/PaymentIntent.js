const mongoose = require('mongoose');
const { TransactionStatus, PaymentPurpose } = require('../domain/enums');

const attemptSchema = new mongoose.Schema({
  status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.INITIATED },
  gatewayUrl: String,
  gatewayTranId: String,
  error: String,
  attemptedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { _id: false });

const paymentIntentSchema = new mongoose.Schema({
  intentId: { type: String, required: true, unique: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amountPaisa: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  purpose: { type: String, enum: Object.values(PaymentPurpose), required: true },
  status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.INITIATED },
  gateway: { type: String, default: 'sslcommerz' },
  gatewayTranId: { type: String, sparse: true },
  gatewayTransactionId: { type: String, sparse: true },
  attempts: [attemptSchema],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date },
}, { timestamps: true });

paymentIntentSchema.index({ status: 1, createdAt: 1 });
paymentIntentSchema.index({ bookingId: 1, purpose: 1 });

paymentIntentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
