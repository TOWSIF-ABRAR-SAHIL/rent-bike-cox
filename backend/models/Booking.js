const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  destination: { type: String },
  securityDeposit: { type: Number, default: 2000 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
  invoiceNumber: { type: String, unique: true, sparse: true },
  packageName: { type: String },
  pickupLocation: { type: String },
  termsAccepted: { type: Boolean, default: false },
  advancePercent: { type: Number },
  tranId: { type: String },
  paymentMethod: { type: String },
  serialNumber: { type: Number }
}, { timestamps: true });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ bike: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
