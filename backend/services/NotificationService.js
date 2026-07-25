const logger = require('../utils/logger');
const bus = require('../events/EventBus');

class NotificationService {
  constructor() {
    this._handlers = new Map();
    bus.on('payment.confirmed', (data) => this.notifyPaymentSuccess(data));
    bus.on('payment.intentCancelled', (data) => this.notifyPaymentFailed(data));
    bus.on('refund.completed', (data) => this.notifyRefundProcessed(data));
    bus.on('booking.cancelled', (data) => this.notifyBookingCancelled(data));
  }

  async notifyPaymentSuccess({ intentId, bookingId, correlationId }) {
    logger.info('[Notification] Payment success', { intentId, bookingId, correlationId });
    return this._dispatch('payment_success', { intentId, bookingId, correlationId });
  }

  async notifyPaymentFailed({ intentId, reason, correlationId }) {
    logger.info('[Notification] Payment failed', { intentId, reason, correlationId });
    return this._dispatch('payment_failed', { intentId, reason, correlationId });
  }

  async notifyRefundProcessed({ refundId, bookingId, amount, correlationId }) {
    logger.info('[Notification] Refund processed', { refundId, bookingId, amount, correlationId });
    return this._dispatch('refund_processed', { refundId, bookingId, amount, correlationId });
  }

  async notifyBookingCancelled({ bookingId, reason, refundAmount, correlationId }) {
    logger.info('[Notification] Booking cancelled', { bookingId, reason, correlationId });
    return this._dispatch('booking_cancelled', { bookingId, reason, refundAmount, correlationId });
  }

  async notifyPayoutReady({ renterId, payoutId, amount, correlationId }) {
    logger.info('[Notification] Payout ready', { renterId, payoutId, amount, correlationId });
    return this._dispatch('payout_ready', { renterId, payoutId, amount, correlationId });
  }

  async notifyFraudDetected({ bookingId, userId, score, decision, correlationId }) {
    logger.warn('[Notification] Fraud detected', { bookingId, userId, score, decision, correlationId });
    return this._dispatch('fraud_detected', { bookingId, userId, score, decision, correlationId });
  }

  registerHandler(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(handler);
  }

  async _dispatch(event, data) {
    const handlers = this._handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (err) {
        logger.error(`Notification handler error for ${event}`, { error: err.message });
      }
    }
  }
}

module.exports = new NotificationService();
