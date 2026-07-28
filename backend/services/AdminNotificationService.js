const AdminNotification = require('../models/AdminNotification');
const logger = require('../utils/logger');

class AdminNotificationService {
  async create({ type, severity = 'info', title, message, data = {} }) {
    try {
      return await AdminNotification.create({ type, severity, title, message, data });
    } catch (error) {
      logger.error('Failed to create admin notification:', error.message);
    }
  }

  async getUnreadCount(userId) {
    return AdminNotification.countDocuments({ isRead: false, readBy: { $ne: userId } });
  }

  async getRecent(userId, limit = 10) {
    return AdminNotification.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async markRead(id, userId) {
    return AdminNotification.findByIdAndUpdate(id, {
      $addToSet: { readBy: userId },
      $set: { isRead: true }
    });
  }

  async markAllRead(userId) {
    return AdminNotification.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId }, $set: { isRead: true } }
    );
  }

  async getAll(filter = {}, page = 1, limit = 20) {
    const total = await AdminNotification.countDocuments(filter);
    const notifications = await AdminNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { notifications, total, page, pages: Math.ceil(total / limit) };
  }

  // Convenience methods for common events
  async notifyNewBooking(booking, user) {
    return this.create({
      type: 'booking', severity: 'info',
      title: 'New Booking',
      message: `${user.name} booked ${booking.bike?.model || 'a vehicle'} — ৳${booking.totalPrice}`,
      data: { bookingId: booking._id }
    });
  }

  async notifyNewUser(user) {
    return this.create({
      type: 'user', severity: 'info',
      title: 'New User Registration',
      message: `${user.name} (${user.email}) registered as ${user.role}`,
      data: { userId: user._id }
    });
  }

  async notifyPaymentSuccess(booking) {
    return this.create({
      type: 'payment', severity: 'info',
      title: 'Payment Received',
      message: `৳${booking.totalPrice} payment for booking #${booking.invoiceNumber || booking._id}`,
      data: { bookingId: booking._id }
    });
  }

  async notifyPaymentFailed(booking, reason) {
    return this.create({
      type: 'payment', severity: 'warning',
      title: 'Payment Failed',
      message: `Payment failed for booking #${booking._id}: ${reason || 'Unknown'}`,
      data: { bookingId: booking._id }
    });
  }

  async notifyFraudDetected(event) {
    return this.create({
      type: 'fraud', severity: 'critical',
      title: 'Fraud Detected',
      message: `Suspicious activity: ${event.type} (score: ${event.score || 'N/A'})`,
      data: { eventId: event._id }
    });
  }

  async notifyNewContactMessage(msg) {
    return this.create({
      type: 'contact', severity: 'info',
      title: 'New Contact Message',
      message: `${msg.name} sent a ${msg.category} message: ${msg.subject}`,
      data: { messageId: msg._id }
    });
  }

  async notifySystemError(title, message) {
    return this.create({
      type: 'system', severity: 'error',
      title, message
    });
  }

  async notifyCircuitBreakerOpen() {
    return this.create({
      type: 'system', severity: 'critical',
      title: 'Payment Gateway Down',
      message: 'Circuit breaker opened for SSLCommerz. Payments may fail.',
      data: { component: 'sslcommerz' }
    });
  }

  async notifyBikePendingVerification(bike) {
    return this.create({
      type: 'user', severity: 'info',
      title: 'New Vehicle Pending',
      message: `${bike.brand} ${bike.model} is pending verification`,
      data: { bikeId: bike._id }
    });
  }
}

module.exports = new AdminNotificationService();
