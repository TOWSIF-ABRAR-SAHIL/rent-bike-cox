const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const { getAdvancePercent } = require('../utils/pricing');
const { releaseBikeLock } = require('../utils/bookingLock');
const { multiplyPaisa, roundPaisa, subtractPaisa } = require('../utils/safeAmount');
const { createJournalEntry } = require('../utils/ledger');
const { isProcessed, markProcessed, verifyCallbackIntegrity } = require('../utils/callbackGuard');
const { checkVelocity, recordFraudEvent, getClientIp, isFingerprintBlocked, buildFingerprint } = require('../utils/fraud');

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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
      .populate('bike', 'model brand pricePerHour images');

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
    const advancePercent = booking.advancePercent || getAdvancePercent(
      Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60))
    );
    const amount = roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent));

    const data = {
      total_amount: amount,
      currency: 'BDT',
      tran_id,
      success_url: `${backendUrl}/api/payment/success/${bookingId}/${tran_id}`,
      fail_url: `${backendUrl}/api/payment/fail/${bookingId}`,
      cancel_url: `${backendUrl}/api/payment/cancel/${bookingId}`,
      ipn_url: `${backendUrl}/api/payment/ipn`,
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

    console.log('[Payment] init:', { bookingId, amount, tran_id, is_live });

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
      const gatewayUrl = apiResponse.GatewayPageURL || apiResponse.redirectGatewayURL;
      if (gatewayUrl) {
        res.json({ url: gatewayUrl });
      } else {
        console.error('[Payment] No gateway URL:', apiResponse);
        res.status(400).json({ message: 'Payment gateway did not return a URL' });
      }
    }).catch(err => {
      console.error('[Payment] SSLCommerz init error:', err.message || err);
      res.status(500).json({ message: 'Payment initialization failed' });
    });
  } catch (error) {
    console.error('[Payment] initPayment error:', error.message);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
};

exports.paymentSuccess = async (req, res) => {
  try {
    const { bookingId, tranId } = req.params;
    console.log('[Payment] Success callback:', { bookingId, tranId });

    if (!bookingId || !tranId) {
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const nonce = `success:${bookingId}:${tranId}`;
    const alreadyProcessed = await isProcessed(nonce);
    if (alreadyProcessed) {
      console.log('[Payment] Replay detected — already processed:', nonce);
      const existingBooking = await Booking.findById(bookingId);
      if (existingBooking && (existingBooking.status === 'Confirmed' || existingBooking.status === 'Completed')) {
        return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
      }
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error('[Payment] Booking not found:', bookingId);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      console.log('[Payment] Idempotent skip — already confirmed:', bookingId);
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
    }

    if (booking.status === 'Expired' || booking.status === 'Cancelled') {
      console.error('[Payment] Booking expired/cancelled:', bookingId);
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { val_id } = req.query;
    if (!val_id) {
      console.error('[Payment] No val_id in redirect — possible bypass');
      await markProcessed(nonce);
      return res.redirect(`${frontendUrl}/payment-failed`);
    }

    const { valid, verified, error } = await verifyCallbackIntegrity(val_id, bookingId);
    if (!valid) {
      console.error('[Payment] SSLCommerz verification failed:', error);
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

    const verifiedAmount = roundPaisa(Number(verified.amount));

    const advancePercent = booking.advancePercent || getAdvancePercent(
      Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60))
    );
    const expectedAdvance = roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent));

    if (verifiedAmount !== expectedAdvance) {
      console.error('[Payment] Amount mismatch:', { verifiedAmount, expectedAdvance });
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

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await Booking.findOneAndUpdate(
          { _id: bookingId, status: 'Pending' },
          {
            $set: {
              status: 'Confirmed',
              paymentStatus: 'Partial',
              advancePaid: expectedAdvance,
              remainingBalance: subtractPaisa(booking.totalPrice, expectedAdvance),
              tranId,
              paymentMethod: 'SSLCommerz',
              paymentVerifiedBy: 'redirect',
              paymentDate: new Date(),
              expiresAt: null,
            },
          },
          { new: true, session }
        );

        if (!claimed) {
          const existing = await Booking.findById(bookingId).session(session);
          if (existing && (existing.status === 'Confirmed' || existing.status === 'Completed')) {
            return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
          }
          return res.redirect(`${frontendUrl}/payment-failed`);
        }

        Object.assign(booking, claimed.toObject());

        if (booking.couponApplied) {
          await Coupon.findByIdAndUpdate(booking.couponApplied, {
            $inc: { usedCount: 1 },
            $addToSet: { usedBy: booking.user },
          }, { session });
        }

        if (!booking.invoiceNumber) {
          booking.invoiceNumber = await generateInvoiceNumber();
        }

        await booking.save({ session });

        await createJournalEntry({
          bookingId: booking._id,
          source: 'redirect',
          reference: tranId,
          entries: [
            { type: 'debit', account: 'advance_paid', amount: expectedAdvance, description: `Advance payment via SSLCommerz (${advancePercent * 100}%)` },
            { type: 'credit', account: 'total_fare', amount: expectedAdvance, description: `Total fare partial credit` },
          ],
        });

        if (booking.totalPrice > expectedAdvance) {
          await createJournalEntry({
            bookingId: booking._id,
            source: 'redirect',
            reference: tranId,
            entries: [
              { type: 'debit', account: 'remaining_balance', amount: subtractPaisa(booking.totalPrice, expectedAdvance), description: 'Remaining balance due at pickup' },
              { type: 'credit', account: 'total_fare', amount: subtractPaisa(booking.totalPrice, expectedAdvance), description: 'Total fare remaining credit' },
            ],
          });
        }
      });
    } finally {
      await session.endSession();
    }

    await markProcessed(nonce);
    console.log('[Payment] Confirmed booking:', bookingId);
    return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
  } catch (error) {
    console.error('[Payment] success error:', error.message, error.stack);
    try {
      return res.redirect(`${frontendUrl}/payment-failed`);
    } catch {
      return res.status(500).json({ message: 'Payment processing failed' });
    }
  }
};

exports.paymentFail = async (req, res) => {
  const { bookingId } = req.params;
  if (bookingId) {
    const ip = getClientIp(req);
    try {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.status !== 'Pending') {
        if (booking.status === 'Confirmed' || booking.status === 'Completed') {
          return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
        }
        return res.redirect(`${frontendUrl}/payment-failed`);
      }
      if (booking) {
        const velocity = await checkVelocity(buildFingerprint(ip, null), 'failed_payment');
        if (velocity.triggered) {
          console.warn('[Payment] Fail velocity exceeded:', { bookingId, count: velocity.count });
          await recordFraudEvent({
            eventType: 'failed_payment',
            userId: booking.user,
            ip,
            metadata: { bookingId, count: velocity.count },
            req,
          });
        }

        console.log('[Payment] Fail — releasing lock for booking:', bookingId);
        await releaseBikeLock(booking.bike);
        booking.status = 'Cancelled';
        booking.cancellationReason = 'Payment failed';
        booking.cancelledAt = new Date();
        await booking.save();
      }
    } catch (err) {
      console.error('[Payment] fail cleanup error:', err.message);
    }
  }
  res.redirect(`${frontendUrl}/payment-failed`);
};

exports.paymentCancel = async (req, res) => {
  const { bookingId } = req.params;
  if (bookingId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.status !== 'Pending') {
        if (booking.status === 'Confirmed' || booking.status === 'Completed') {
          return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
        }
        return res.redirect(`${frontendUrl}/payment-cancelled`);
      }
      if (booking) {
        console.log('[Payment] Cancel — releasing lock for booking:', bookingId);
        await releaseBikeLock(booking.bike);
        booking.status = 'Cancelled';
        booking.cancellationReason = 'User cancelled payment';
        booking.cancelledAt = new Date();
        await booking.save();
      }
    } catch (err) {
      console.error('[Payment] cancel cleanup error:', err.message);
    }
  }
  res.redirect(`${frontendUrl}/payment-cancelled`);
};

exports.paymentIPN = async (req, res) => {
  try {
    const { val_id, tran_id, status, store_id: ipn_store_id, store_passwd: ipn_store_pass } = req.body;
    console.log('[IPN] Received:', { val_id, tran_id, status });

    if (!val_id) {
      console.error('[IPN] Missing val_id');
      return res.status(400).json({ status: 'ERROR', message: 'Missing val_id' });
    }

    const ipnNonce = `success:${booking._id}:${tran_id}`;
    const alreadyProcessed = await isProcessed(ipnNonce);
    if (alreadyProcessed) {
      console.log('[IPN] Replay detected — already processed:', val_id);
      return res.status(200).json({ status: 'OK' });
    }

    const { valid, verified, error } = await verifyCallbackIntegrity(val_id, tran_id);
    if (!valid) {
      console.error('[IPN] Verification failed:', error);
      return res.status(200).json({ status: 'OK' });
    }

    const booking = await Booking.findOne({ tranId: tran_id });
    if (!booking) {
      console.error('[IPN] No booking found for tranId:', tran_id);
      await markProcessed(ipnNonce);
      return res.status(200).json({ status: 'OK' });
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      console.log('[IPN] Already confirmed, idempotent:', booking._id);
      await markProcessed(ipnNonce);
      return res.status(200).json({ status: 'OK' });
    }

    const advancePercent = booking.advancePercent || getAdvancePercent(
      Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60))
    );
    const expectedAdvance = roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent));
    const verifiedAmount = roundPaisa(Number(verified.amount));
    if (verifiedAmount !== expectedAdvance) {
      console.error('[IPN] Amount mismatch:', { verifiedAmount, expectedAdvance });
      await recordFraudEvent({
        eventType: 'amount_mismatch',
        userId: booking.user,
        ip: getClientIp(req),
        metadata: { bookingId: booking._id.toString(), tranId: tran_id, verifiedAmount, expectedAdvance },
        req,
      });
      await markProcessed(ipnNonce);
      return res.status(200).json({ status: 'OK' });
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
              advancePaid: roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent)),
              remainingBalance: subtractPaisa(booking.totalPrice, roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent))),
              paymentMethod: verified.method || 'SSLCommerz',
              paymentVerifiedBy: 'ipn',
              paymentDate: new Date(),
              expiresAt: null,
            },
          },
          { new: true, session }
        );

        if (!claimed) {
          const existing = await Booking.findById(booking._id).session(session);
          if (existing && (existing.status === 'Confirmed' || existing.status === 'Completed')) {
            await markProcessed(ipnNonce);
            return res.status(200).json({ status: 'OK' });
          }
          await markProcessed(ipnNonce);
          return res.status(200).json({ status: 'OK' });
        }

        Object.assign(booking, claimed.toObject());

        if (!booking.invoiceNumber) {
          booking.invoiceNumber = await generateInvoiceNumber();
        }

        if (booking.couponApplied) {
          await Coupon.findByIdAndUpdate(booking.couponApplied, {
            $inc: { usedCount: 1 },
            $addToSet: { usedBy: booking.user },
          }, { session });
        }

        await booking.save({ session });

        await createJournalEntry({
          bookingId: booking._id,
          source: 'ipn',
          reference: tran_id,
          entries: [
            { type: 'debit', account: 'advance_paid', amount: booking.advancePaid, description: `IPN confirmed advance payment` },
            { type: 'credit', account: 'total_fare', amount: booking.advancePaid, description: 'Total fare partial credit (IPN)' },
          ],
        });

        if (booking.totalPrice > booking.advancePaid) {
          await createJournalEntry({
            bookingId: booking._id,
            source: 'ipn',
            reference: tran_id,
            entries: [
              { type: 'debit', account: 'remaining_balance', amount: subtractPaisa(booking.totalPrice, booking.advancePaid), description: 'Remaining balance due at pickup (IPN)' },
              { type: 'credit', account: 'total_fare', amount: subtractPaisa(booking.totalPrice, booking.advancePaid), description: 'Total fare remaining credit (IPN)' },
            ],
          });
        }
      });
    } finally {
      await session.endSession();
    }

    await markProcessed(ipnNonce);
    console.log('[IPN] Confirmed booking via IPN:', booking._id);
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('[IPN] Error:', error.message);
    res.status(500).json({ status: 'ERROR', message: 'IPN processing failed' });
  }
};
