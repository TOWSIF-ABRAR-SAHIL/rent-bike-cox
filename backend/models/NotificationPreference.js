const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  email: {
    bookingConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    maintenanceReminder: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false },
    weeklyDigest: { type: Boolean, default: false },
  },
  push: {
    bookingConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    maintenanceReminder: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false },
  },
  inApp: {
    bookingConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    maintenanceReminder: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
