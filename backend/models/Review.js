const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 100 },
  comment: { type: String, trim: true, maxlength: 1000 },
  response: { type: String, trim: true, maxlength: 500 },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: { type: Date },
}, { timestamps: true });

reviewSchema.index({ bike: 1, user: 1 }, { unique: true });
reviewSchema.index({ bike: 1, createdAt: -1 });
reviewSchema.index({ bike: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
