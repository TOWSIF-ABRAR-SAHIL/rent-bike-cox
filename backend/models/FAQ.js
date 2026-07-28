const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  category: { type: String, required: true, trim: true, index: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 }
}, { timestamps: true });

faqSchema.index({ isActive: 1, category: 1, order: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
