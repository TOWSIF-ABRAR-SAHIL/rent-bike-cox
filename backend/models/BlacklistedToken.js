const mongoose = require('mongoose');
const crypto = require('crypto');

const blacklistedTokenSchema = new mongoose.Schema({
  jtiHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  reason: { type: String, enum: ['logout', 'password_change', 'admin_revoke'], default: 'logout' },
}, { timestamps: true });

blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

blacklistedTokenSchema.statics.hashJti = function (jti) {
  return crypto.createHash('sha256').update(jti).digest('hex');
};

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);
