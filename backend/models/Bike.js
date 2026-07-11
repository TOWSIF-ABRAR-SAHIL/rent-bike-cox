const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  model: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, enum: ['Bike', 'Car'], required: true },
  description: { type: String, required: true },
  pricePerHour: { type: Number, required: true, default: 200 },
  images: [{ type: String, required: true }], // Array for multi-angle images
  availability: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Bike', bikeSchema);
