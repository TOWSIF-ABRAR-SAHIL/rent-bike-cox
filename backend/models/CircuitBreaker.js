const mongoose = require('mongoose');

const circuitBreakerSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  dailyRefundCap: { type: Number, default: 50000 },
  totalRefunded: { type: Number, default: 0 },
  refundCount: { type: Number, default: 0 },
  isTripped: { type: Boolean, default: false },
  trippedAt: { type: Date },
  trippedBy: { type: String },
  unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  unlockedAt: { type: Date },
}, { timestamps: true });

circuitBreakerSchema.index({ date: 1 });

module.exports = mongoose.model('CircuitBreaker', circuitBreakerSchema);
