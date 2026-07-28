const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['booking', 'payment', 'user', 'error', 'fraud', 'contact', 'system'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

adminNotificationSchema.index({ isRead: 1, createdAt: -1 });
adminNotificationSchema.index({ type: 1, severity: 1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
