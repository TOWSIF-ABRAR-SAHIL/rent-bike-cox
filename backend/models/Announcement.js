const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['banner', 'popup', 'notice'], default: 'banner' },
  position: { type: String, enum: ['top', 'bottom', 'modal', 'sidebar'], default: 'top' },
  pages: [{ type: String, default: 'all' }],
  audience: { type: String, enum: ['all', 'users', 'renters', 'admins', 'guests'], default: 'all' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  isDismissible: { type: Boolean, default: true },
  bgColor: { type: String, default: '#f59e0b' },
  textColor: { type: String, default: '#000000' },
  linkText: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  priority: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

announcementSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
announcementSchema.index({ priority: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
