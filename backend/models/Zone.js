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
  center: {
    lat: { type: Number },
    lng: { type: Number },
  },
  polygon: [[Number]], // array of [lat, lng] pairs for map boundary
  color: { type: String, default: '#f59e0b' },
  bikeCount: { type: Number, default: 0 },
  // Tourist info
  highlights: [String], // e.g. ['Beach', 'Sea Food', 'Sunset Point']
  distanceFromCenter: String, // e.g. "12 km"
  typicalRentPrice: String, // e.g. "200-300 TK/hr"
}, { timestamps: true });

zoneSchema.index({ isActive: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
