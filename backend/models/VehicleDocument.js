const mongoose = require('mongoose');

const vehicleDocumentSchema = new mongoose.Schema({
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['registration', 'insurance', 'fitness', 'pollution', 'other'],
    required: true,
  },
  name: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  issuingAuthority: { type: String },
  documentNumber: { type: String },
  notes: { type: String },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
}, { timestamps: true });

vehicleDocumentSchema.index({ bike: 1, type: 1 });
vehicleDocumentSchema.index({ renter: 1 });
vehicleDocumentSchema.index({ expiryDate: 1 });

vehicleDocumentSchema.index({ bike: 1, createdAt: -1 });

module.exports = mongoose.model('VehicleDocument', vehicleDocumentSchema);
