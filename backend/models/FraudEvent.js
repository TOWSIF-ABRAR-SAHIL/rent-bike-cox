const mongoose = require('mongoose');

const fraudEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['failed_payment', 'coupon_abuse', 'velocity_check', 'amount_mismatch', 'suspicious_activity'],
    required: true,
  },
  fingerprint: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  phone: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  actionTaken: { type: String, enum: ['none', 'flagged', 'held', 'blocked'], default: 'none' },
}, { timestamps: true });

fraudEventSchema.index({ fingerprint: 1, createdAt: -1 });
fraudEventSchema.index({ ip: 1, createdAt: -1 });
fraudEventSchema.index({ phone: 1, createdAt: -1 });
fraudEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('FraudEvent', fraudEventSchema);
