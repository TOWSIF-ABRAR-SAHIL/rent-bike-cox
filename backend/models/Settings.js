const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  basePricePerHour: { type: Number, required: true, default: 200 },
  packages: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
