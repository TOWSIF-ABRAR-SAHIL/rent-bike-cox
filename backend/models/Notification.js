const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['booking', 'payment', 'maintenance', 'system', 'promotion'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 500 },
  data: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
