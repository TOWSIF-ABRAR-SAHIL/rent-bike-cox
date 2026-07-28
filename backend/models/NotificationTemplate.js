const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  variables: [{ type: String }],
  channel: { type: String, enum: ['email', 'sms', 'inApp', 'push'], default: 'inApp' },
  subject: { type: String },
  isActive: { type: Boolean, default: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

notificationTemplateSchema.index({ key: 1 });
notificationTemplateSchema.index({ channel: 1, isActive: 1 });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
