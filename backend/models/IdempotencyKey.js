const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  response: { type: mongoose.Schema.Types.Mixed },
  statusCode: { type: Number },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
