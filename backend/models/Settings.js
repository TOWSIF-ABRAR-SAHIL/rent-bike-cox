const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  basePricePerHour: { type: Number, required: true, default: 200 },
  packages: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ],
  adminCommissionPercent: { type: Number, default: 10 },
  payoutSchedule: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
  supportedCurrencies: [{ type: String, default: 'BDT' }],
  gatewayPreference: [{ type: String, default: 'sslcommerz' }],
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
