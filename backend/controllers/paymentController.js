const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const mongoose = require('mongoose');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const { getAdvancePercent } = require('../utils/pricing');
const { roundPaisa, multiplyPaisa, subtractPaisa } = require('../utils/safeAmount');
const { createJournalEntry } = require('../utils/ledger');
const { isProcessed, markProcessed, verifyCallbackIntegrity } = require('../utils/callbackGuard');
const { checkVelocity, recordFraudEvent, getClientIp, isFingerprintBlocked, buildFingerprint } = require('../utils/fraud');
const { withOptionalTransaction } = require('../utils/withOptionalTransaction');
const bus = require('../events/EventBus');
const { increment } = require('../utils/metrics');
const logger = require('../utils/logger');

const notificationService = require('../services/NotificationService');
const adminNotify = require('../services/AdminNotificationService');

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

function advanceForBooking(booking) {
  const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
  const advancePercent = booking.advancePercent || getAdvancePercent(hours);
  return { advancePercent, expectedAdvance: roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent)) };
}

/**
 * Confirm a booking against a verified gateway callback.
 *
 * Deliberately never touches the HTTP response: it runs inside a transaction
 * that MongoDB may retry, so any response written here would be written twice.
 * Callers map the returned outcome to exactly one response.
 *
 * @returns {Promise<{outcome: 'confirmed'|'already'|'invalid', booking?: object}>}
 */
async function claimConfirmedPayment({
  booking, tranId, expectedAdvance, method, verifiedBy, ledgerSource,
}) {
  const bookingId = booking._id;
  const totalPrice = booking.totalPrice;

  const result = await withOptionalTransaction(async (session) => {
    const claimFilter = { _id: bookingId, status: 'Pending' };
    const claimUpdate = {
      $set: {
        status: 'Confirmed',
        state: 'CONFIRMED',
        paymentStatus: 'Partial',
        advancePaid: expectedAdvance,
        remainingBalance: subtractPaisa(totalPrice, expectedAdvance),
        tranId,
        paymentMethod: method || 'SSLCommerz',
        paymentVerifiedBy: verifiedBy,
        paymentDate: new Date(),
        expiresAt: null,
      },
      $push: {
        stateHistory: {
          from: booking.state || 'PAYMENT_PENDING',
          to: 'CONFIRMED',
          at: new Date(),
          reason: `Payment verified via ${verifiedBy}`,
        },
      },
    };

    const claimOpts = { new: true };
    if (session) claimOpts.session = session;

    const claimed = await Booking.findOneAndUpdate(claimFilter, claimUpdate, claimOpts);

    if (!claimed) {
      const existingQuery = Booking.findById(bookingId);
      if (session) existingQuery.session(session);
      const existing = await existingQuery;
      return {
        outcome: existing && (existing.status === 'Confirmed' || existing.status === 'Completed')
          ? 'already'
          : 'invalid',
      };
    }

    // Coupon usage is recorded once per booking — this claim is what guarantees
    // that, so the increment can never double-count a coupon.
    if (claimed.couponApplied) {
      const couponOpts = {};
      if (session) couponOpts.session = session;
      await Coupon.findByIdAndUpdate(claimed.couponApplied, {
        $inc: { usedCount: 1 },
        $addToSet: { usedBy: { user: claimed.user, booking: claimed._id, usedAt: new Date() } },
      }, couponOpts);
    }

    if (!claimed.invoiceNumber) {
      claimed.invoiceNumber = await generateInvoiceNumber();
      const saveOpts = {};
      if (session) saveOpts.session = session;
      await claimed.save(saveOpts);
    }

    const journalOpts = { session };

    await createJournalEntry({
      bookingId: claimed._id,
      source: ledgerSource,
      reference: tranId,
      entries: [
        { type: 'debit', account: 'advance_paid', amount: expectedAdvance, description: `Advance payment via SSLCommerz` },
        { type: 'credit', account: 'total_fare', amount: expectedAdvance, description: 'Total fare partial credit' },
      ],
    }, journalOpts);

    const remaining = subtractPaisa(totalPrice, expectedAdvance);
    if (remaining > 0) {
      await createJournalEntry({
        bookingId: claimed._id,
        source: ledgerSource,
        reference: tranId,
        entries: [
          { type: 'debit', account: 'remaining_balance', amount: remaining, description: 'Remaining balance due at pickup' },
          { type: 'credit', account: 'total_fare', amount: remaining, description: 'Total fare remaining credit' },
        ],
      }, journalOpts);
    }

    return { outcome: 'confirmed', booking: claimed };
  });

  return result;
}

async function notifyPaymentConfirmed(booking, tranId) {
  try {
    const user = await User.findById(booking.user).lean();
    if (user) {
      await notificationService.notifyPaymentConfirmed(
        { _id: booking._id, advancePaid: booking.advancePaid, invoiceNumber: booking.invoiceNumber },
        { _id: user._id, name: user.name },
        { tranId }
      );
    }
  } catch (nErr) {
    logger.warn('Payment notification failed (non-blocking)', { error: nErr.message });
  }
}

exports.initPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

    const ip = getClientIp(req);
    const fingerprint = buildFingerprint(ip, null);
    const blocked = await isFingerprintBlocked(fingerprint);
    if (blocked) {
      return res.status(403).json({ message: 'Access temporarily restricted. Contact support.' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email address phoneNumber')
      .populate('bike', 'model brand pricePerHour images')
      .lean();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to pay for this booking' });
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      return res.status(400).json({ message: 'Booking is already paid for' });
    }

    if (booking.status === 'Expired' || booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'This booking is no longer valid' });
    }

    if (!store_id || !store_passwd) {
      return res.status(500).json({ message: 'Payment gateway not configured' });
    }

    const tran_id = new mongoose.Types.ObjectId().toString();
    const { advancePercent, expectedAdvance: amount } = advanceForBooking(booking);

    const data = {
      total_amount: amount,
      currency: 'BDT',
      tran_id,
      success_url: `${backendUrl}/api/payment/success/${bookingId}/${tran_id}`,
      // tranId is part of the fail/cancel URLs so those callbacks can prove they
      // belong to this booking before cancelling anything.
      fail_url: `${backendUrl}/api/payment/fail/${bookingId}/${tran_id}`,
      cancel_url: `${backendUrl}/api/payment/cancel/${bookingId}/${tran_id}`,
      ipn_url: `${backendUrl}/api/payment/ipn`,
      // value_a lets the server-to-server IPN recover the booking even if the
      // tranId lookup ever misses.
      value_a: String(bookingId),
      value_b: String(amount),
      shipping_method: 'No',
      product_name: booking.bike.model,
      product_category: 'Rental',
      product_profile: 'general',
      cus_name: booking.user.name,
      cus_email: booking.user.email,
      cus_add1: booking.user.address || 'Cox\'s Bazar',
      cus_city: 'Cox\'s Bazar',
      cus_postcode: '4700',
      cus_country: 'Bangladesh',
      cus_phone: booking.user.phoneNumber || '01700000000',
      cus_fax: booking.user.phoneNumber || '01700000000',
      ship_name: booking.user.name,
      ship_add1: booking.user.address || 'Cox\'s Bazar',
      ship_city: 'Cox\'s Bazar',
      ship_state: 'Cox\'s Bazar',
      ship_postcode: '4700',
      ship_country: 'Bangladesh',
    };

    logger.info('init', { tag: 'Payment', bookingId, amount, tran_id, is_live });

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    let apiResponse;
    try {
      apiResponse = await sslcz.init(data);
    } catch (err) {
      logger.error('SSLCommerz init error', { tag: 'Payment', error: err.message || err });
      return res.status(500).json({ message: 'Payment initialization failed' });
    }

    const gatewayUrl = apiResponse.GatewayPageURL || apiResponse.redirectGatewayURL;
    if (!gatewayUrl) {
      logger.error('No gateway URL', { tag: 'Payment', apiResponse });
      return res.status(400).json({ message: 'Payment gateway did not return a URL' });
    }

    // Persisted BEFORE the customer is handed to the gateway. Without this the
    // server-to-server IPN has nothing to look the booking up by, and a payment
    // that never returns through the browser is silently lost.
    await Booking.findByIdAndUpdate(bookingId, { $set: { tranId: tran_id } });

    return res.json({ url: gatewayUrl });
  } catch (error) {
    logger.error('initPayment error', { tag: 'Payment', message: error.message });
    res.status(500).json({ message: 'Payment initialization failed' });
  }
};

exports.paymentSuccess = async (req, res) => {
  try {
    const { bookingId, tranId } = req.params;
    logger.info('Success callback', { tag: 'Payment', bookingId, tranId });

    if (!bookingId || !tranId) {
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const nonce = `success:${bookingId}:${tranId}`;
    if (await isProcessed(nonce)) {
      logger.info('Replay detected — already processed', { tag: 'Payment', nonce });
      const existing = await Booking.findById(bookingId).lean();
      if (existing && (existing.status === 'Confirmed' || existing.status === 'Completed')) {
        return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
      }
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      logger.error('Booking not found', { tag: 'Payment', bookingId });
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      logger.info('Idempotent skip — already confirmed', { tag: 'Payment', bookingId });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
    }

    if (booking.status === 'Expired' || booking.status === 'Cancelled') {
      logger.error('Booking expired/cancelled', { tag: 'Payment', bookingId });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { val_id } = req.query;
    if (!val_id) {
      logger.error('No val_id in redirect — possible bypass', { tag: 'Payment' });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { valid, verified, error } = await verifyCallbackIntegrity(val_id);
    if (!valid) {
      logger.error('SSLCommerz verification failed', { tag: 'Payment', error });
      await recordFraudEvent({
        eventType: 'amount_mismatch',
        userId: booking.user,
        ip: getClientIp(req),
        metadata: { bookingId, tranId, error },
        req,
      });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    if (verified.tran_id && verified.tran_id !== tranId) {
      logger.error('Callback tranId mismatch — possible replay', {
        tag: 'Payment', bookingId, urlTranId: tranId, gatewayTranId: verified.tran_id,
      });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { expectedAdvance } = advanceForBooking(booking);
    const verifiedAmount = roundPaisa(Number(verified.amount));

    if (verifiedAmount !== expectedAdvance) {
      logger.error('Amount mismatch', { tag: 'Payment', verifiedAmount, expectedAdvance });
      await recordFraudEvent({
        eventType: 'amount_mismatch',
        userId: booking.user,
        ip: getClientIp(req),
        metadata: { bookingId, tranId, verifiedAmount, expectedAdvance },
        req,
      });
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { outcome, booking: confirmed } = await claimConfirmedPayment({
      booking,
      tranId,
      expectedAdvance,
      method: verified.method,
      verifiedBy: 'redirect',
      ledgerSource: 'redirect',
    });

    if (outcome !== 'confirmed') {
      logger.info(`Success callback outcome: ${outcome}`, { tag: 'Payment', bookingId });
      await markProcessed(nonce);
      return res.redirect(
        outcome === 'already' ? `${frontendUrl}/invoice/${bookingId}` : `${frontendUrl}/payment-failed`
      );
    }

    await markProcessed(nonce);
    logger.info('Confirmed booking', { tag: 'Payment', bookingId });
    increment('payment_success');
    bus.emit('payment.confirmed', { bookingId, tranId, source: 'redirect' });

    await notifyPaymentConfirmed(confirmed, tranId);
    try {
      await adminNotify.notifyPaymentSuccess({
        _id: confirmed._id,
        invoiceNumber: confirmed.invoiceNumber,
        totalPrice: confirmed.totalPrice,
      });
    } catch { /* non-blocking */ }

    return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
  } catch (error) {
    logger.error('success error', { tag: 'Payment', message: error.message, stack: error.stack });
    if (res.headersSent) return undefined;
    return res.redirect(`${frontendUrl}/payment-failed`);
  }
};

/**
 * Cancel an unpaid booking from a gateway fail/cancel redirect.
 * Requires the tranId from the URL to match the booking, so a third party who
 * only knows a booking id cannot cancel someone else's checkout.
 */
async function cancelUnpaidBooking({ bookingId, tranId, reason, metric, event }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { cancelled: false, reason: 'not_found' };

  if (booking.status === 'Confirmed' || booking.status === 'Completed') {
    return { cancelled: false, reason: 'already_paid' };
  }
  if (booking.status === 'Expired' || booking.status === 'Cancelled') {
    return { cancelled: false, reason: 'already_closed' };
  }

  if (!tranId || !booking.tranId || booking.tranId !== tranId) {
    logger.warn('Rejected unverified payment-cancel callback', {
      tag: 'Payment', bookingId, urlTranId: tranId || null, bookingTranId: booking.tranId || null,
    });
    return { cancelled: false, reason: 'unverified' };
  }

  booking.status = 'Cancelled';
  booking.cancellationReason = reason;
  // Schema field is `cancellationAt`; the old `cancelledAt` assignment was
  // silently dropped by strict mode, losing the timestamp.
  booking.cancellationAt = new Date();
  await booking.save();

  increment(metric);
  bus.emit(event, { bookingId, reason });

  if (metric === 'payment_fail') {
    try {
      const user = await User.findById(booking.user).lean();
      if (user) {
        await notificationService.notifyPaymentFailed(
          { _id: booking._id, invoiceNumber: booking.invoiceNumber },
          { _id: user._id, name: user.name }
        );
      }
    } catch (nErr) {
      logger.warn('Payment fail notification failed (non-blocking)', { error: nErr.message });
    }
  }

  return { cancelled: true, booking };
}

exports.paymentFail = async (req, res) => {
  const { bookingId, tranId } = req.params;
  try {
    if (bookingId) {
      const ip = getClientIp(req);
      const booking = await Booking.findById(bookingId).lean();

      if (booking && (booking.status === 'Confirmed' || booking.status === 'Completed')) {
        return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
      }

      if (booking && booking.status !== 'Expired' && booking.status !== 'Cancelled') {
        const velocity = await checkVelocity(buildFingerprint(ip, null), 'failed_payment');
        if (velocity.triggered) {
          logger.warn('Fail velocity exceeded', { tag: 'Payment', bookingId, count: velocity.count });
          await recordFraudEvent({
            eventType: 'failed_payment',
            userId: booking.user,
            ip,
            metadata: { bookingId, count: velocity.count },
            req,
          });
        }

        await cancelUnpaidBooking({
          bookingId,
          tranId,
          reason: 'Payment failed',
          metric: 'payment_fail',
          event: 'payment.failed',
        });
      }
    }
  } catch (err) {
    logger.error('fail cleanup error', { tag: 'Payment', message: err.message });
  }
  return res.redirect(`${frontendUrl}/payment-failed`);
};

exports.paymentCancel = async (req, res) => {
  const { bookingId, tranId } = req.params;
  try {
    if (bookingId) {
      await cancelUnpaidBooking({
        bookingId,
        tranId,
        reason: 'User cancelled payment',
        metric: 'payment_cancel',
        event: 'payment.cancelled',
      });
    }
  } catch (err) {
    logger.error('cancel cleanup error', { tag: 'Payment', message: err.message });
  }
  return res.redirect(`${frontendUrl}/payment-cancelled`);
};

exports.paymentIPN = async (req, res) => {
  const ok = () => res.status(200).json({ status: 'OK' });

  try {
    const { val_id, tran_id, status } = req.body;
    logger.info('Received', { tag: 'IPN', val_id, tran_id, status });

    if (!val_id) {
      logger.error('Missing val_id', { tag: 'IPN' });
      return res.status(400).json({ status: 'ERROR', message: 'Missing val_id' });
    }

    const { valid, verified, error } = await verifyCallbackIntegrity(val_id);
    if (!valid) {
      logger.error('Verification failed', { tag: 'IPN', error });
      return ok();
    }

    // tranId is persisted at init, so this lookup is the primary path. value_a
    // (the booking id) is the recovery path if it ever misses.
    const gatewayTranId = verified.tran_id || tran_id;
    let booking = await Booking.findOne({ tranId: gatewayTranId });
    if (!booking && verified.value_a) {
      booking = await Booking.findById(verified.value_a);
      if (booking) {
        logger.warn('IPN recovered booking via value_a', { tag: 'IPN', bookingId: booking._id.toString() });
      }
    }

    if (!booking) {
      logger.error('No booking found for IPN — manual reconciliation required', {
        tag: 'IPN', tran_id: gatewayTranId, val_id,
      });
      return ok();
    }

    const ipnNonce = `success:${booking._id}:${gatewayTranId}`;
    if (await isProcessed(ipnNonce)) {
      logger.info('Replay detected — already processed', { tag: 'IPN', val_id });
      return ok();
    }

    // Already handled by the browser redirect; nothing further to do.
    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      logger.info('Already confirmed, idempotent', { tag: 'IPN', bookingId: booking._id });
      await markProcessed(ipnNonce);
      return ok();
    }

    // Paid but the booking already expired (the pre-fix failure mode): the IPN
    // is verified money, so confirm rather than discard it.
    if (booking.status === 'Cancelled') {
      logger.error('IPN for a cancelled booking — manual reconciliation required', {
        tag: 'IPN', bookingId: booking._id.toString(), tran_id: gatewayTranId,
      });
      await markProcessed(ipnNonce);
      return ok();
    }

    const { expectedAdvance } = advanceForBooking(booking);
    const verifiedAmount = roundPaisa(Number(verified.amount));

    if (verifiedAmount !== expectedAdvance) {
      logger.error('Amount mismatch', { tag: 'IPN', verifiedAmount, expectedAdvance });
      await recordFraudEvent({
        eventType: 'amount_mismatch',
        userId: booking.user,
        ip: getClientIp(req),
        metadata: { bookingId: booking._id.toString(), tranId: gatewayTranId, verifiedAmount, expectedAdvance },
        req,
      });
      await markProcessed(ipnNonce);
      return ok();
    }

    if (booking.status === 'Expired') {
      // Revive an expired-but-paid booking so the customer keeps what they paid for.
      booking.status = 'Pending';
      booking.expiresAt = null;
      await booking.save();
      logger.warn('Revived expired booking from verified IPN', { tag: 'IPN', bookingId: booking._id.toString() });
    }

    const { outcome, booking: confirmed } = await claimConfirmedPayment({
      booking,
      tranId: gatewayTranId,
      expectedAdvance,
      method: verified.method,
      verifiedBy: 'ipn',
      ledgerSource: 'ipn',
    });

    await markProcessed(ipnNonce);

    if (outcome !== 'confirmed') {
      logger.info(`IPN outcome: ${outcome}`, { tag: 'IPN', bookingId: booking._id.toString() });
      return ok();
    }

    logger.info('Confirmed booking via IPN', { tag: 'IPN', bookingId: confirmed._id.toString() });
    increment('payment_success');
    bus.emit('payment.confirmed', { bookingId: confirmed._id.toString(), tranId: gatewayTranId, source: 'ipn' });

    await notifyPaymentConfirmed(confirmed, gatewayTranId);
    try {
      await adminNotify.notifyPaymentSuccess({
        _id: confirmed._id,
        invoiceNumber: confirmed.invoiceNumber,
        totalPrice: confirmed.totalPrice,
      });
    } catch { /* non-blocking */ }

    return ok();
  } catch (error) {
    logger.error('Error', { tag: 'IPN', message: error.message });
    // Always acknowledge so the gateway does not retry forever.
    return res.status(200).json({ status: 'OK' });
  }
};

/**
 * Admin reconciliation: bookings that look paid but were never confirmed.
 *
 * Reports only — it never writes. Historically these exist because the IPN could
 * not find the booking (tranId was never persisted), so money was collected while
 * the booking expired. Confirm each one deliberately via POST /api/booking/confirm.
 */
exports.getUnconfirmedPayments = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 90));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const suspects = await Booking.find({
      status: { $in: ['Pending', 'Expired'] },
      tranId: { $exists: true, $ne: null },
      createdAt: { $gte: since },
    })
      .select('user bike totalPrice advancePaid advancePercent status tranId invoiceNumber createdAt startTime endTime paymentStatus')
      .populate('user', 'name email')
      .populate('bike', 'model brand')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const rows = suspects.map((b) => {
      const { expectedAdvance } = advanceForBooking(b);
      return {
        bookingId: b._id,
        invoiceNumber: b.invoiceNumber || null,
        status: b.status,
        paymentStatus: b.paymentStatus,
        tranId: b.tranId,
        createdAt: b.createdAt,
        startTime: b.startTime,
        endTime: b.endTime,
        totalPrice: b.totalPrice,
        advancePaid: b.advancePaid,
        expectedAdvance,
        customer: b.user ? { name: b.user.name, email: b.user.email } : null,
        vehicle: b.bike ? `${b.bike.brand} ${b.bike.model}` : null,
      };
    });

    res.json({
      days,
      count: rows.length,
      note: 'Read-only. A booking appears here when a gateway transaction id exists but the booking was never confirmed. Verify against the SSLCommerz dashboard, then confirm deliberately via POST /api/booking/confirm.',
      bookings: rows,
    });
  } catch (error) {
    logger.error('getUnconfirmedPayments error', { tag: 'Payment', message: error.message });
    res.status(500).json({ message: 'Failed to build reconciliation report' });
  }
};
