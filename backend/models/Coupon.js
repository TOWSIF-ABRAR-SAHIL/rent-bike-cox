const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercent: { type: Number, min: 1, max: 100 },
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
  discountFixedPaisa: { type: Number },
  maxDiscountPaisa: { type: Number },
  minBookingAmountPaisa: { type: Number },
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  firstTimeUserOnly: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: 0 },
  maxUsesPerUser: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  usedBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, usedAt: { type: Date, default: Date.now }, booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' } }],
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
