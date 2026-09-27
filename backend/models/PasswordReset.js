const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  // A 6-digit OTP is only 1e6 possibilities; without a cap it is brute-forceable
  // by anyone who knows the address.
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetSchema.statics.hashOtp = function (otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
