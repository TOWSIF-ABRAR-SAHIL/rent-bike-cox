const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { sendEmail, templates } = require('./emailService');
const logger = require('../utils/logger');

class NotificationService {
  async createAndNotify(userId, { type, title, message, data = {}, emailSubject, emailTemplate, emailData = {}, prefType }) {
    try {
      const inAppPromise = Notification.create({ user: userId, type, title, message, data });

      let emailPromise = Promise.resolve();
      if (emailSubject && emailTemplate && prefType) {
        const shouldSend = await this.shouldNotify(userId, prefType, 'email');
        if (shouldSend) {
          emailPromise = this._sendEmailSafe(userId, emailSubject, emailTemplate, emailData);
        }
      }

      await Promise.allSettled([inAppPromise, emailPromise]);
    } catch (err) {
      logger.error('createAndNotify error', { userId, type, error: err.message });
    }
  }

  async shouldNotify(userId, type, channel) {
    try {
      const prefs = await NotificationPreference.findOne({ user: userId }).lean();
      if (!prefs) return true;
      if (channel === 'email') return prefs.email?.[type] !== false;
      if (channel === 'push') return prefs.push?.[type] !== false;
      if (channel === 'inApp') return prefs.inApp?.[type] !== false;
      return true;
    } catch {
      return true;
    }
  }

  async _sendEmailSafe(userId, subject, htmlFn, data) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId).select('email').lean();
      if (!user?.email) return;
      await sendEmail({ to: user.email, subject, html: htmlFn(data) });
    } catch (err) {
      logger.warn('Notification email failed (non-blocking)', { userId, error: err.message });
    }
  }

  async notifyBookingCreated(booking, user) {
    await this.createAndNotify(user._id || booking.user, {
      type: 'booking',
      title: 'Booking Created',
      message: `Your booking for ${booking.bikeName || 'your vehicle'} has been created. Complete payment to confirm.`,
      data: { bookingId: booking._id, action: '/my-bookings' },
      emailSubject: 'Booking Created — Rent Bike Cox\'s Bazar',
      emailTemplate: templates.bookingConfirmation,
      emailData: {
        userName: user.name,
        bikeName: booking.bikeName || 'Vehicle',
        date: new Date(booking.startTime).toLocaleDateString('en-BD'),
        hours: booking.hours || 'N/A',
        totalPrice: booking.totalPrice,
        advancePaid: booking.advancePaid || 0,
      },
      prefType: 'bookingConfirmation',
    });
  }

  async notifyPaymentConfirmed(booking, user, { tranId } = {}) {
    await this.createAndNotify(user._id || booking.user, {
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Payment of ${booking.advancePaid} TK received for booking ${booking.invoiceNumber || booking._id}.`,
      data: { bookingId: booking._id, action: '/my-bookings' },
      emailSubject: 'Payment Confirmed — Rent Bike Cox\'s Bazar',
      emailTemplate: templates.paymentConfirmation,
      emailData: {
        userName: user.name,
        amount: booking.advancePaid,
        bookingId: booking.invoiceNumber || booking._id.toString(),
        tranId,
      },
      prefType: 'paymentConfirmation',
    });
  }

  async notifyBookingCancelled(booking, user, { refundAmount } = {}) {
    await this.createAndNotify(user._id || booking.user, {
      type: 'booking',
      title: 'Booking Cancelled',
      message: refundAmount > 0
        ? `Your booking has been cancelled. Refund of ${refundAmount} TK will be processed within 3-5 business days.`
        : 'Your booking has been cancelled.',
      data: { bookingId: booking._id, action: '/my-bookings' },
      emailSubject: 'Booking Cancelled — Rent Bike Cox\'s Bazar',
      emailTemplate: templates.bookingCancellation,
      emailData: { userName: user.name, refundAmount },
      prefType: 'bookingCancellation',
    });
  }

  async notifyPaymentFailed(booking, user) {
    await this.createAndNotify(user._id || booking.user, {
      type: 'payment',
      title: 'Payment Failed',
      message: `Payment for booking ${booking.invoiceNumber || booking._id} failed. Please try again.`,
      data: { bookingId: booking._id, action: '/my-bookings' },
      emailSubject: 'Payment Failed — Rent Bike Cox\'s Bazar',
      emailTemplate: templates.paymentFailed,
      emailData: {
        userName: user.name,
        bookingId: booking.invoiceNumber || booking._id.toString(),
      },
      prefType: 'paymentConfirmation',
    });
  }

  async notifyRefundProcessed(booking, user, { refundAmount } = {}) {
    await this.createAndNotify(user._id || booking.user, {
      type: 'payment',
      title: 'Refund Processed',
      message: `Refund of ${refundAmount} TK has been processed for booking ${booking.invoiceNumber || booking._id}.`,
      data: { bookingId: booking._id, action: '/my-bookings' },
      emailSubject: 'Refund Processed — Rent Bike Cox\'s Bazar',
      emailTemplate: templates.refundProcessed,
      emailData: {
        userName: user.name,
        bookingId: booking.invoiceNumber || booking._id.toString(),
        refundAmount,
      },
      prefType: 'bookingCancellation',
    });
  }

  async notifyFraudDetected({ bookingId, userId, score, decision }) {
    const Admin = require('../models/User');
    const admins = await Admin.find({ role: 'Admin' }).select('_id').lean();
    for (const admin of admins) {
      await this.createAndNotify(admin._id, {
        type: 'system',
        title: 'Fraud Alert',
        message: `Suspicious activity detected (score: ${score}). Decision: ${decision}. Booking: ${bookingId}`,
        data: { bookingId, action: '/admin-dashboard' },
        prefType: 'maintenanceReminder',
      });
    }
  }

  async notifyWelcome(user) {
    await this.createAndNotify(user._id, {
      type: 'system',
      title: 'Welcome!',
      message: `Welcome to Rent Bike Cox's Bazar, ${user.name}! Browse our vehicles and start your journey.`,
      data: { action: '/' },
      emailSubject: 'Welcome to Rent Bike Cox\'s Bazar!',
      emailTemplate: templates.welcome,
      emailData: { userName: user.name },
      prefType: 'bookingConfirmation',
    });
  }

  async notifyMaintenanceDue(bike, renterId) {
    await this.createAndNotify(renterId, {
      type: 'maintenance',
      title: 'Maintenance Reminder',
      message: `${bike.brand} ${bike.model} is due for maintenance. Last service: ${bike.lastServiceDate ? new Date(bike.lastServiceDate).toLocaleDateString('en-BD') : 'Unknown'}.`,
      data: { bikeId: bike._id, action: '/fleet' },
      prefType: 'maintenanceReminder',
    });
  }

  async cleanupOldNotifications(daysOld = 90) {
    try {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old notifications`);
      }
      return result.deletedCount;
    } catch (err) {
      logger.error('Notification cleanup error', { error: err.message });
      return 0;
    }
  }
}

module.exports = new NotificationService();
