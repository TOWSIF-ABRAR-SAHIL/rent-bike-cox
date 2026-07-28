const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: String,
  success: { type: Boolean, required: true },
  failureCount: { type: Number, default: 0 },
}, { timestamps: true });

loginAttemptSchema.index({ email: 1, createdAt: -1 });
loginAttemptSchema.index({ ip: 1, createdAt: -1 });
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
