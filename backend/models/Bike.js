const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  model: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  videoUrl: { type: String },
  description: { type: String, required: true },
  pricePerHour: { type: Number, required: true, default: 200, min: 0 },
  images: [{ type: String, required: true }],
  availability: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packages: [{
    label: { type: String, required: true },
    minHours: { type: Number, required: true, min: 1 },
    maxHours: { type: Number, default: null },
    hourlyRate: { type: Number, required: true, min: 0 }
  }],
  currentMileage: { type: Number, min: 0, default: 0 },
  lastServiceDate: { type: Date },
  nextServiceDue: { type: Date },
  nextServiceMileage: { type: Number, min: 0 },
  isUnderMaintenance: { type: Boolean, default: false },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [92.0100, 21.4200] },
    updatedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true });

bikeSchema.index({ availability: 1, isVerified: 1 });
bikeSchema.index({ renter: 1 });
bikeSchema.index({ category: 1 });
bikeSchema.index({ model: 'text', brand: 'text' });
bikeSchema.index({ 'currentLocation': '2dsphere' });
bikeSchema.index({ category: 1, availability: 1, isVerified: 1 });
bikeSchema.index({ renter: 1, createdAt: -1 });

module.exports = mongoose.model('Bike', bikeSchema);
