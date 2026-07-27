const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  type: { type: String, enum: ['service', 'repair', 'inspection', 'oil_change', 'tire_replacement', 'brake_service', 'battery', 'other'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  cost: { type: Number, min: 0, default: 0 },
  mileage: { type: Number, min: 0 },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  nextServiceDue: { type: Date },
  nextServiceMileage: { type: Number, min: 0 },
  status: { type: String, enum: ['completed', 'in_progress', 'scheduled', 'cancelled'], default: 'completed' },
  attachments: [{ type: String }],
  notes: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

maintenanceLogSchema.index({ bike: 1, performedAt: -1 });
maintenanceLogSchema.index({ bike: 1, type: 1 });
maintenanceLogSchema.index({ nextServiceDue: 1, status: 1 });

maintenanceLogSchema.index({ bike: 1, createdAt: -1 });
maintenanceLogSchema.index({ bike: 1, type: 1, status: 1 });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
