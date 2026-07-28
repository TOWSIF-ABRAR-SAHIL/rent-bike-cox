const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const variableSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String, default: '' },
  example: { type: String, default: '' }
}, { _id: false });

const historyEntrySchema = new mongoose.Schema({
  channels: { type: mongoose.Schema.Types.Mixed },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const notificationTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, default: '' },
  channels: {
    email: { type: channelSchema, default: () => ({}) },
    inApp: { type: channelSchema, default: () => ({}) },
    sms: { type: channelSchema, default: () => ({}) },
    push: { type: channelSchema, default: () => ({}) }
  },
  variables: { type: [variableSchema], default: [] },
  category: { type: String, enum: ['auth', 'booking', 'payment', 'vehicle', 'admin', 'system', 'marketing'], default: 'system' },
  isActive: { type: Boolean, default: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  history: { type: [historyEntrySchema], default: [] }
}, { timestamps: true });

notificationTemplateSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
