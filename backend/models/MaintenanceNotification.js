const mongoose = require('mongoose');

const maintenanceNotificationSchema = new mongoose.Schema({
  bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['service_due', 'service_overdue', 'inspection_due', 'mileage_due'], required: true },
  message: { type: String, required: true },
  dueDate: { type: Date, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
}, { timestamps: true });

maintenanceNotificationSchema.index({ renter: 1, acknowledged: 1 });
maintenanceNotificationSchema.index({ bike: 1, type: 1 });

maintenanceNotificationSchema.index({ bike: 1, type: 1, acknowledged: 1 });

module.exports = mongoose.model('MaintenanceNotification', maintenanceNotificationSchema);
