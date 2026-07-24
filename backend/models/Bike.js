const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  model: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  videoUrl: { type: String },
  description: { type: String, required: true },
  pricePerHour: { type: Number, required: true, default: 200 },
  images: [{ type: String, required: true }],
  availability: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packages: [{
    label: { type: String, required: true },
    durationType: { type: String, enum: ['hour', 'day', 'week', 'month'], required: true },
    durationValue: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }]
}, { timestamps: true });

bikeSchema.index({ availability: 1, isVerified: 1 });
bikeSchema.index({ renter: 1 });
bikeSchema.index({ category: 1 });
bikeSchema.index({ model: 'text', brand: 'text' });

module.exports = mongoose.model('Bike', bikeSchema);
