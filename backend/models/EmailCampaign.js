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
  status: { type: String, enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'], default: 'draft' },
  scheduledAt: { type: Date },
  sentAt: { type: Date },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

emailCampaignSchema.index({ status: 1, createdAt: -1 });
emailCampaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
