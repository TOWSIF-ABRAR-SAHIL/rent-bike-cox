const mongoose = require('mongoose');

const seasonalRateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['peak', 'offpeak', 'holiday', 'weekend', 'custom'],
    required: true,
  },
  multiplier: { type: Number, required: true, min: 0.5, max: 3.0 },
  startDate: { type: Date },
  endDate: { type: Date },
  recurringYearly: { type: Boolean, default: false },
  month: { type: Number, min: 1, max: 12 },
  dayOfMonth: { type: Number, min: 1, max: 31 },
  daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

seasonalRateSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
seasonalRateSchema.index({ recurringYearly: 1, month: 1, dayOfMonth: 1 });
seasonalRateSchema.index({ daysOfWeek: 1 });

module.exports = mongoose.model('SeasonalRate', seasonalRateSchema);
