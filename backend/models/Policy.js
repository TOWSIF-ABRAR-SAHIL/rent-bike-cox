const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['terms', 'fine', 'safety', 'petrol', 'legal', 'refund'], required: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 }
}, { timestamps: true });

policySchema.index({ type: 1, sortOrder: 1 });

module.exports = mongoose.model('Policy', policySchema);
