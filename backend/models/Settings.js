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

settingsSchema.pre('save', function (next) {
  if (this.basePricePerHour !== undefined && (this.basePricePerHour < 100 || this.basePricePerHour > 100000)) {
    return next(new Error('basePricePerHour must be between 100 and 100000'));
  }
  if (this.adminCommissionPercent !== undefined && (this.adminCommissionPercent < 0 || this.adminCommissionPercent > 50)) {
    return next(new Error('adminCommissionPercent must be between 0 and 50'));
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
