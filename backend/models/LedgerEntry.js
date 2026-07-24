const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  type: { type: String, enum: ['debit', 'credit'], required: true },
  account: {
    type: String,
    enum: ['total_fare', 'advance_paid', 'remaining_balance', 'security_deposit', 'security_deposit_refund', 'coupon_discount', 'refund', 'platform_fee'],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  description: { type: String, required: true },
  reference: { type: String },
  source: { type: String, enum: ['system', 'ipn', 'redirect', 'manual', 'admin', 'walkin', 'reconciliation'], required: true },
  idempotencyKey: { type: String },
}, { timestamps: true });

ledgerEntrySchema.index({ bookingId: 1, createdAt: 1 });
ledgerEntrySchema.index({ reference: 1 });
ledgerEntrySchema.index({ account: 1, createdAt: 1 });
ledgerEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

ledgerEntrySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
