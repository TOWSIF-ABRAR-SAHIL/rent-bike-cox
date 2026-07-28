const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['banner', 'popup', 'notice', 'maintenance'], default: 'banner' },
  position: { type: String, enum: ['top', 'bottom', 'modal', 'sidebar'], default: 'top' },
  pages: [{ type: String, default: 'all' }],
  audience: { type: String, enum: ['all', 'users', 'renters', 'admins', 'guests'], default: 'all' },
  schedule: {
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    showOnce: { type: Boolean, default: false },
    frequency: { type: String, enum: ['always', 'once', 'daily'], default: 'always' }
  },
  isActive: { type: Boolean, default: true },
  isDismissible: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  style: {
    bgColor: { type: String, default: '#f59e0b' },
    textColor: { type: String, default: '#000000' },
    icon: { type: String, default: '' },
    borderColor: { type: String, default: '' }
  },
  actions: {
    ctaText: { type: String, default: '' },
    ctaUrl: { type: String, default: '' },
    ctaNewTab: { type: Boolean, default: false }
  },
  analytics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    dismissals: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

announcementSchema.index({ isActive: 1, 'schedule.startDate': 1, 'schedule.endDate': 1 });
announcementSchema.index({ priority: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
