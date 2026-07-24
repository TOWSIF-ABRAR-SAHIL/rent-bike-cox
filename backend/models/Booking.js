const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  // Financial fields
  totalPrice: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  advancePercent: { type: Number },
  remainingBalance: { type: Number },
  securityDeposit: { type: Number, default: 2000 },
  securityDepositPaid: { type: Boolean, default: false },
  securityDepositRefunded: { type: Boolean, default: false },

  destination: { type: String },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Expired'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid', 'Refunded'], default: 'Unpaid' },
  invoiceNumber: { type: String, unique: true, sparse: true },
  packageName: { type: String },
  pickupLocation: { type: String },
  termsAccepted: { type: Boolean, default: false },

  // Payment audit trail
  tranId: { type: String },
  paymentMethod: { type: String },
  paymentVerifiedBy: { type: String, enum: ['redirect', 'ipn', 'manual'] },
  paymentDate: { type: Date },
  serialNumber: { type: Date },

  // Booking lifecycle
  lockedAt: { type: Date },
  expiresAt: { type: Date },
  pickupConfirmedAt: { type: Date },

  // Coupon
  couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },

  // Cancellation & refund
  cancellationAt: { type: Date },
  cancellationReason: { type: String },
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  refundMethod: { type: String },

  // Walk-in fields
  customerName: { type: String },
  customerPhone: { type: String },
  customerNid: { type: String },
}, { timestamps: true });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ bike: 1, status: 1 });
bookingSchema.index({ bike: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ status: 1, createdAt: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
