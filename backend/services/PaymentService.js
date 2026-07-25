const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const PaymentIntent = require('../models/PaymentIntent');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');
const { generateIntentId } = require('../utils/generators');
const { getAdvancePercent } = require('../utils/pricing');
const { roundPaisa, multiplyPaisa, subtractPaisa } = require('../utils/safeAmount');
const { releaseBikeLock } = require('../utils/bookingLock');

class PaymentService {
  constructor() {
    this._gatewayRegistry = null;
  }

  _getRegistry() {
    if (!this._gatewayRegistry) {
      this._gatewayRegistry = require('../gateways/GatewayRegistry');
    }
    return this._gatewayRegistry;
  }

  async createPaymentIntent({ bookingId, userId, purpose = 'ADVANCE', gateway: gatewayName, correlationId }) {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email phoneNumber')
      .populate('bike', 'model brand');

    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'Pending') throw new Error('Booking is not in Pending status');

    const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
    const advancePercent = booking.advancePercent || getAdvancePercent(hours);
    const amountPaisa = roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent));

    const intentId = await generateIntentId();
    const gateway = this._getRegistry().get(gatewayName || 'sslcommerz');

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const paymentResult = await gateway.createPayment({
      amount: amountPaisa,
      currency: 'BDT',
      intentId,
      bookingId: booking._id.toString(),
      customerEmail: booking.user.email,
      customerName: booking.user.name,
      customerPhone: booking.user.phoneNumber,
      items: [{ name: booking.bike.model, category: 'Rental' }],
      successUrl: `${backendUrl}/api/payment/success/${booking._id}/${intentId}`,
      failUrl: `${backendUrl}/api/payment/fail/${booking._id}`,
      cancelUrl: `${backendUrl}/api/payment/cancel/${booking._id}`,
      ipnUrl: `${backendUrl}/api/payment/ipn`,
    });

    const intent = await PaymentIntent.create({
      intentId,
      bookingId: booking._id,
      userId: booking.user._id,
      amountPaisa,
      purpose,
      status: 'INITIATED',
      gateway: gateway.name,
      gatewayTranId: paymentResult.tranId,
      attempts: [{
        status: 'INITIATED',
        gatewayUrl: paymentResult.gatewayUrl,
        gatewayTranId: paymentResult.tranId,
      }],
      correlationId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    bus.emit('payment.intentCreated', { intentId, bookingId, amountPaisa, purpose, correlationId });
    logger.info('Payment intent created', { intentId, bookingId: booking._id.toString(), amountPaisa });

    return { intentId, gatewayUrl: paymentResult.gatewayUrl, intent };
  }

  async processWebhook({ body, gateway: gatewayName, correlationId }) {
    const gateway = this._getRegistry().get(gatewayName || 'sslcommerz');
    const verified = await gateway.verifyCallback(body);
    const tranId = verified.tran_id || verified.tranId;
    const valId = verified.val_id;

    const intent = await PaymentIntent.findOne({ gatewayTranId: tranId })
      .sort({ createdAt: -1 });

    if (!intent) {
      logger.warn('No intent found for webhook', { tranId });
      return { processed: false, reason: 'no_intent' };
    }

    if (intent.status === 'SUCCEEDED') {
      logger.info('Webhook already processed (idempotent)', { intentId: intent.intentId });
      return { processed: true, idempotent: true };
    }

    const booking = await Booking.findById(intent.bookingId);
    if (!booking) {
      logger.error('Booking not found for intent', { intentId: intent.intentId });
      return { processed: false, reason: 'no_booking' };
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      logger.info('Booking already confirmed (idempotent)', { bookingId: booking._id.toString() });
      intent.status = 'SUCCEEDED';
      await intent.save();
      return { processed: true, idempotent: true };
    }

    if (booking.status === 'Expired' || booking.status === 'Cancelled') {
      logger.warn('Booking expired/cancelled, cannot confirm', { bookingId: booking._id.toString() });
      intent.status = 'FAILED';
      await intent.save();
      return { processed: false, reason: 'booking_expired' };
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await Booking.findOneAndUpdate(
          { _id: booking._id, status: 'Pending' },
          {
            $set: {
              status: 'Confirmed',
              paymentStatus: 'Partial',
              advancePaid: intent.amountPaisa,
              remainingBalance: subtractPaisa(booking.totalPrice, intent.amountPaisa),
              tranId,
              paymentMethod: verified.method || 'SSLCommerz',
              paymentVerifiedBy: 'ipn',
              paymentDate: new Date(),
              expiresAt: null,
              state: 'CONFIRMED',
            },
          },
          { new: true, session }
        );

        if (!claimed) throw new Error('Failed to claim booking — concurrent modification');

        intent.status = 'SUCCEEDED';
        intent.gatewayTransactionId = valId;
        await intent.save({ session });
      });
    } finally {
      await session.endSession();
    }

    bus.emit('payment.confirmed', { intentId: intent.intentId, bookingId: booking._id.toString(), correlationId });
    logger.info('Payment confirmed via webhook', { intentId: intent.intentId, bookingId: booking._id.toString() });

    return { processed: true, bookingId: booking._id.toString() };
  }

  async cancelPaymentIntent({ intentId, reason }) {
    const intent = await PaymentIntent.findOne({ intentId });
    if (!intent) throw new Error('Intent not found');
    if (intent.status === 'SUCCEEDED') throw new Error('Cannot cancel completed payment');

    intent.status = 'CANCELLED';
    intent.attempts.push({ status: 'CANCELLED', error: reason });
    await intent.save();

    bus.emit('payment.intentCancelled', { intentId, reason });
    return { cancelled: true };
  }

  async getPendingIntentsForBooking(bookingId) {
    return PaymentIntent.find({
      bookingId,
      status: { $in: ['INITIATED', 'PROCESSING'] },
    }).sort({ createdAt: -1 });
  }
}

module.exports = new PaymentService();
