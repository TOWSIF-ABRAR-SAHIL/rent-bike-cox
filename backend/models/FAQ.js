const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  category: { type: String, required: true, trim: true, index: true },
  tags: [{ type: String }],
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  relatedFAQs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

faqSchema.index({ isActive: 1, category: 1, order: 1 });
faqSchema.index({ isPinned: -1 });
faqSchema.index({ tags: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
