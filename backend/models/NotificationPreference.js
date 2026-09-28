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
    // Account/onboarding mail (welcome, security notices). Mapped explicitly
    // because there was no key for it and welcome mail was being gated on the
    // booking-confirmation preference.
    accountAlerts: { type: Boolean, default: true },
    // Operator-facing alerts (fraud, system). Gated on its own key so muting
    // maintenance reminders can never silence a fraud alert.
    adminAlerts: { type: Boolean, default: true },
  },
  push: {
    bookingConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    maintenanceReminder: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false },
    accountAlerts: { type: Boolean, default: true },
    adminAlerts: { type: Boolean, default: true },
  },
  inApp: {
    bookingConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    maintenanceReminder: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true },
    accountAlerts: { type: Boolean, default: true },
    adminAlerts: { type: Boolean, default: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
