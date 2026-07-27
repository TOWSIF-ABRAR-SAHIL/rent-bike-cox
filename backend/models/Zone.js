const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  bounds: {
    north: { type: Number },
    south: { type: Number },
    east: { type: Number },
    west: { type: Number },
  },
  color: { type: String, default: '#f59e0b' },
  bikeCount: { type: Number, default: 0 },
}, { timestamps: true });

zoneSchema.index({ isActive: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
