const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },
  audience: {
    filter: { type: String, enum: ['all', 'users', 'renters', 'admins', 'custom'], default: 'all' },
    customUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    conditions: { type: mongoose.Schema.Types.Mixed }
  },
  status: { type: String, enum: ['draft', 'scheduled', 'sending', 'paused', 'sent', 'failed', 'cancelled'], default: 'draft' },
  scheduling: {
    sendAt: { type: Date },
    timezone: { type: String, default: 'Asia/Dhaka' }
  },
  progress: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 }
  },
  batchSize: { type: Number, default: 50 },
  batchDelay: { type: Number, default: 5000 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  sentAt: { type: Date },
  completedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

emailCampaignSchema.index({ status: 1, createdAt: -1 });
emailCampaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
