const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  reason: {
    type: String,
    enum: ['refund', 'damage', 'overcharge', 'no_show', 'wrong_vehicle', 'late_return', 'maintenance', 'other'],
    required: true,
  },
  description: { type: String, required: true, maxlength: 2000 },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved', 'Rejected'],
    default: 'Open',
  },
  resolution: { type: String, maxlength: 2000 },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: true });

disputeSchema.index({ user: 1, createdAt: -1 });
disputeSchema.index({ booking: 1 });
disputeSchema.index({ status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
