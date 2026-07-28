const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['general', 'booking', 'payment', 'complaint', 'suggestion'], default: 'general' },
  status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reply: { type: String },
  repliedAt: { type: Date },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String }
}, { timestamps: true });

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ category: 1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
