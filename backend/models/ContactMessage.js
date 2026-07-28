const mongoose = require('mongoose');

const conversationEntrySchema = new mongoose.Schema({
  sender: { type: String, enum: ['customer', 'admin'], required: true },
  message: { type: String, required: true },
  attachments: [{ type: String }],
  sentAt: { type: Date, default: Date.now },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const metadataSchema = new mongoose.Schema({
  ipAddress: { type: String },
  userAgent: { type: String },
  referrerPage: { type: String }
}, { _id: false });

const contactMessageSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['general', 'booking', 'payment', 'complaint', 'suggestion', 'partnership', 'emergency'], default: 'general' },
  status: { type: String, enum: ['new', 'open', 'inProgress', 'waitingReply', 'resolved', 'closed'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conversation: { type: [conversationEntrySchema], default: [] },
  tags: [{ type: String }],
  metadata: { type: metadataSchema, default: () => ({}) },
  resolvedAt: { type: Date },
  rating: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ category: 1 });
contactMessageSchema.index({ priority: 1 });
contactMessageSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
