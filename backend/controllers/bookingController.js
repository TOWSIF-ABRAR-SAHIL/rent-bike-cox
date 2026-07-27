const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const Coupon = require('../models/Coupon');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const { calculateBookingPrice, applyCoupon } = require('../utils/pricing');
const { createBookingAtomically, extendBookingAtomically, createWalkInBooking, releaseBikeLock } = require('../utils/bookingLock');
const { calculateRefundWithBreaker, processRefund } = require('../utils/refund');
const { roundPaisa, multiplyPaisa, subtractPaisa } = require('../utils/safeAmount');
const { createJournalEntry } = require('../utils/ledger');
const { checkVelocity, recordFraudEvent, getClientIp, isFingerprintBlocked, buildFingerprint } = require('../utils/fraud');
const { sanitize } = require('../utils/sanitize');
const bus = require('../events/EventBus');
const { increment } = require('../utils/metrics');
const logger = require('../utils/logger');
const { sendEmail, templates } = require('../services/emailService');
const NotificationPreference = require('../models/NotificationPreference');

const CHECKOUT_TIMEOUT_MS = 5 * 60 * 1000;

exports.createBooking = async (req, res) => {
  try {
    const userDoc = await require('../models/User').findById(req.user.id).lean();
    if (!userDoc || !userDoc.isVerified) {
      return res.status(403).json({ message: 'Account not verified. Please upload your NID and license for admin verification.' });
    }

    const ip = getClientIp(req);
    const fingerprint = buildFingerprint(ip, userDoc.phoneNumber);
    const blocked = await isFingerprintBlocked(fingerprint);
    if (blocked) {
      return res.status(403).json({ message: 'Access temporarily restricted. Contact support.' });
    }

    const { bikeId, startTime, endTime, couponCode, destination } = req.body;
    if (!bikeId || !startTime || !endTime) {
      return res.status(400).json({ message: 'bikeId, startTime, and endTime are required' });
    }

    const startMs = new Date(startTime).getTime();
    if (startMs < Date.now() + 10 * 60 * 1000) {
      return res.status(400).json({ message: 'Start time must be at least 10 minutes from now' });
    }

    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.isUnderMaintenance) {
      return res.status(400).json({ message: 'This bike is currently under maintenance and not available for booking' });
    }

    const pricing = await calculateBookingPrice(bike.pricePerHour, startTime, endTime, bike.packages);

    if (req.body.totalPrice !== undefined && Number(req.body.totalPrice) !== pricing.totalPrice) {
      logger.warn('Price tampering detected', { userId: req.user.id, bikeId, clientPrice: req.body.totalPrice, serverPrice: pricing.totalPrice });
    }

    let couponDoc = null;
    if (couponCode) {
      const code = couponCode.toUpperCase().trim();

      couponDoc = await Coupon.findOneAndUpdate(
        {
          code,
          isActive: true,
          $and: [
            { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
            { $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
          ],
        },
        { $setOnInsert: {} },
        { new: true }
      );

      if (!couponDoc) {
        const existing = await Coupon.findOne({ code });
        if (existing) {
          return res.status(400).json({ message: 'Coupon is invalid, expired, or has reached its usage limit' });
        }
        return res.status(400).json({ message: 'Coupon not found' });
      }

      const userUsageCount = couponDoc.usedBy ? couponDoc.usedBy.filter(entry => entry.user?.toString() === req.user.id).length : 0;
      if (couponDoc.maxUsesPerUser > 0 && userUsageCount >= couponDoc.maxUsesPerUser) {
        return res.status(400).json({ message: 'You have already used this coupon' });
      }

      pricing.totalPrice = applyCoupon(pricing.totalPrice, couponDoc.discountPercent);
      pricing.minAdvance = roundPaisa(multiplyPaisa(pricing.totalPrice, pricing.advancePercent));
    }

    const lockResult = await createBookingAtomically(bikeId, startTime, endTime, {
      user: req.user.id,
      bike: bikeId,
      startTime,
      endTime,
      totalPrice: pricing.totalPrice,
      advancePaid: 0,
      advancePercent: pricing.advancePercent,
      destination: sanitize(destination) || '',
      securityDeposit: 2000,
      status: 'Pending',
      packageName: pricing.packageName,
      termsAccepted: true,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + CHECKOUT_TIMEOUT_MS),
      couponApplied: couponDoc ? couponDoc._id : undefined,
    }, req.user.id);

    if (!lockResult.success) {
      return res.status(409).json({ message: lockResult.message });
    }

    res.status(201).json({
      booking: lockResult.booking,
      minAdvance: pricing.minAdvance,
      pricing: {
        totalPrice: pricing.totalPrice,
        minAdvance: pricing.minAdvance,
        hours: pricing.hours,
        isShortRental: pricing.isShortRental,
        advancePercent: pricing.advancePercent,
        packageName: pricing.packageName,
        couponApplied: couponDoc ? { code: couponDoc.code, discount: couponDoc.discountPercent } : null,
      },
    });

    increment('booking_created');
    bus.emit('booking.created', { bookingId: lockResult.booking._id.toString(), userId: req.user.id, bikeId, totalPrice: pricing.totalPrice });
  } catch (error) {
    logger.error('createBooking error', { tag: 'Booking', message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Booking creation failed' });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only administrators can manually confirm payments' });
    }

    if (booking.status === 'Confirmed' || booking.status === 'Completed') {
      return res.status(400).json({ message: 'Booking is already confirmed or completed' });
    }

    if (booking.status === 'Expired' || booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'This booking can no longer be confirmed' });
    }

    const advancePercent = booking.advancePercent || 0.5;
    const computedAdvance = roundPaisa(multiplyPaisa(booking.totalPrice, advancePercent));
    const remainingBalance = subtractPaisa(booking.totalPrice, computedAdvance);

    const session = await require('mongoose').startSession();
    try {
      await session.withTransaction(async () => {
        booking.advancePaid = computedAdvance;
        booking.remainingBalance = remainingBalance;
        booking.paymentStatus = advancePercent >= 1 ? 'Paid' : 'Partial';
        booking.status = 'Confirmed';
        booking.paymentVerifiedBy = 'manual';
        booking.paymentDate = new Date();
        booking.expiresAt = undefined;

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
      });
    } finally {
      await session.endSession();
    }

    await createJournalEntry({
      bookingId: booking._id,
      source: 'manual',
      reference: booking.invoiceNumber,
      entries: [
        { type: 'debit', account: 'advance_paid', amount: computedAdvance, description: `Manual confirmation advance (${advancePercent * 100}%)` },
        { type: 'credit', account: 'total_fare', amount: computedAdvance, description: 'Total fare partial credit (manual)' },
      ],
    });

    if (remainingBalance > 0) {
      await createJournalEntry({
        bookingId: booking._id,
        source: 'manual',
        reference: booking.invoiceNumber,
        entries: [
          { type: 'debit', account: 'remaining_balance', amount: remainingBalance, description: 'Remaining balance due at pickup (manual)' },
          { type: 'credit', account: 'total_fare', amount: remainingBalance, description: 'Total fare remaining credit (manual)' },
        ],
      });
    }

    res.json({ message: 'Payment confirmed', booking });

    try {
      const userDoc = await require('../models/User').findById(booking.user);
      if (userDoc?.email) {
        const prefs = await NotificationPreference.findOne({ user: userDoc._id });
        if (prefs?.email?.paymentConfirmation !== false) {
          await sendEmail({
            to: userDoc.email,
            subject: 'Payment Confirmed — Rent Bike Cox\'s Bazar',
            html: templates.paymentConfirmation({
              userName: userDoc.name,
              amount: computedAdvance,
              bookingId: booking.invoiceNumber || bookingId,
            }),
          });
        }
      }
    } catch (emailErr) {
      logger.warn('Confirm email send failed (non-blocking)', { message: emailErr.message });
    }
  } catch (error) {
    logger.error('confirmPayment error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Payment confirmation failed' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.status === 'Completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }

    const refund = await calculateRefundWithBreaker(booking);
    const originalStatus = booking.status;

    const session = await require('mongoose').startSession();
    try {
      await session.withTransaction(async () => {
        booking.status = 'Cancelled';
        booking.refundAmount = refund.refundableAmount;
        booking.cancellationReason = refund.penaltyReason;
        booking.paymentStatus = refund.refundableAmount > 0 ? 'Refunded' : 'Partial';
        booking.cancellationAt = new Date();
        await booking.save({ session });

        if (booking.couponApplied && originalStatus !== 'Pending') {
          await Coupon.findByIdAndUpdate(booking.couponApplied, {
            $inc: { usedCount: -1 },
            $min: { usedCount: 0 },
            $pull: { usedBy: booking.user },
          }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    await releaseBikeLock(booking.bike);

    if (refund.refundableAmount > 0) {
      await processRefund(booking, refund.refundableAmount);
      await createJournalEntry({
        bookingId: booking._id,
        source: 'admin',
        reference: booking.invoiceNumber || booking._id.toString(),
        entries: [
          { type: 'debit', account: 'refund', amount: refund.refundableAmount, description: `Refund: ${refund.penaltyReason}` },
          { type: 'credit', account: 'advance_paid', amount: refund.refundableAmount, description: 'Refund credited against advance' },
        ],
      });
    }

    res.json({
      message: 'Booking cancelled',
      booking,
      refund: {
        refundPercent: refund.refundPercent,
        refundableAmount: refund.refundableAmount,
        reason: refund.penaltyReason,
        circuitBreakerTripped: refund.circuitBreakerTripped || false,
        circuitBreakerCapped: refund.circuitBreakerCapped || false,
      },
    });

    increment('booking_cancelled');
    bus.emit('booking.cancelled', { bookingId: booking._id.toString(), userId: req.user.id, refundAmount: refund.refundableAmount });

    try {
      const userDoc = await require('../models/User').findById(booking.user);
      if (userDoc?.email) {
        const prefs = await NotificationPreference.findOne({ user: userDoc._id });
        if (prefs?.email?.bookingCancellation !== false) {
          await sendEmail({
            to: userDoc.email,
            subject: 'Booking Cancelled — Rent Bike Cox\'s Bazar',
            html: templates.bookingCancellation({
              userName: userDoc.name,
              refundAmount: refund.refundableAmount,
            }),
          });
        }
      }
    } catch (emailErr) {
      logger.warn('Cancel email send failed (non-blocking)', { message: emailErr.message });
    }
  } catch (error) {
    logger.error('cancelBooking error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Booking cancellation failed' });
  }
};

exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phoneNumber address')
      .populate({
        path: 'bike',
        select: 'model brand pricePerHour',
        populate: { path: 'category', select: 'name slug' },
      });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      const bike = await require('../models/Bike').findById(booking.bike._id).select('renter');
      if (!bike || bike.renter.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this booking' });
      }
    }

    if (req.user.role === 'Admin') {
      const owner = await require('../models/User').findById(booking.user._id).select('nid license');
      if (owner) {
        booking.user = { ...booking.user.toObject(), nid: owner.nid, license: owner.license };
      }
    }

    res.json(booking);
  } catch (error) {
    logger.error('getBookingDetails error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate({
        path: 'bike',
        select: 'model brand pricePerHour images category',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (error) {
    logger.error('getMyBookings error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

exports.getRenterBookings = async (req, res) => {
  try {
    if (req.user.role !== 'Renter') return res.status(403).json({ message: 'Access denied' });
    const renterBikes = await Bike.find({ renter: req.user.id }).select('_id').lean();
    const bikeIds = renterBikes.map(b => b._id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await Booking.countDocuments({ bike: { $in: bikeIds } });
    const bookings = await Booking.find({ bike: { $in: bikeIds } })
      .skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'bike',
        select: 'model brand pricePerHour',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getRenterBookings error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Failed to fetch renter bookings' });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await Booking.countDocuments();
    const bookings = await Booking.find().skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'bike',
        select: 'model brand pricePerHour',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getAllBookings error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Failed to fetch all bookings' });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'Admin' && req.user.role !== 'Renter') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'Renter') {
      const bike = await Bike.findById(booking.bike).select('renter').lean();
      if (!bike || bike.renter?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to complete this booking' });
      }
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be completed' });
    }

    booking.status = 'Completed';
    await booking.save();

    await releaseBikeLock(booking.bike);

    if (booking.remainingBalance > 0) {
      await createJournalEntry({
        bookingId: booking._id,
        source: 'system',
        reference: booking.invoiceNumber,
        entries: [
          { type: 'debit', account: 'advance_paid', amount: booking.remainingBalance, description: 'Remaining balance collected at completion' },
          { type: 'credit', account: 'remaining_balance', amount: booking.remainingBalance, description: 'Remaining balance cleared' },
        ],
      });
    }

    res.json({ message: 'Booking completed', booking });
  } catch (error) {
    logger.error('completeBooking error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Failed to complete booking' });
  }
};

exports.checkoutHeartbeat = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        status: 'Pending',
        expiresAt: { $gt: new Date() },
      },
      { $set: { expiresAt: new Date(Date.now() + CHECKOUT_TIMEOUT_MS) } },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking expired or not found' });
    }

    res.json({ expiresAt: booking.expiresAt });
  } catch (error) {
    logger.error('heartbeat error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Heartbeat failed' });
  }
};

exports.extendBooking = async (req, res) => {
  try {
    const { newEndTime } = req.body;
    if (!newEndTime) return res.status(400).json({ message: 'newEndTime is required' });

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to extend this booking' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be extended' });
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(newEndTime);
    if (newEnd <= currentEnd) {
      return res.status(400).json({ message: 'New end time must be after current end time' });
    }

    const additionalMs = newEnd - currentEnd;
    const additionalHours = Math.ceil(additionalMs / (1000 * 60 * 60));

    const bike = await Bike.findById(booking.bike).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const additionalPricing = await calculateBookingPrice(bike.pricePerHour, currentEnd, newEndTime, bike.packages);
    const additionalPrice = additionalPricing.totalPrice;

    const result = await extendBookingAtomically(booking._id, newEndTime, additionalPrice);
    if (!result.success) {
      return res.status(409).json({ message: result.message });
    }

    await createJournalEntry({
      bookingId: booking._id,
      source: 'system',
      reference: booking.invoiceNumber,
      entries: [
        { type: 'debit', account: 'remaining_balance', amount: additionalPrice, description: `Booking extension: ${additionalHours}h` },
        { type: 'credit', account: 'total_fare', amount: additionalPrice, description: `Total fare adjustment: +${additionalHours}h` },
      ],
    });

    res.json({
      message: 'Booking extended',
      booking: result.booking,
      additionalHours,
      additionalPrice,
      newTotalPrice: result.booking.totalPrice,
    });
  } catch (error) {
    logger.error('extendBooking error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Extension failed' });
  }
};

exports.createWalkInBooking = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can create walk-in bookings' });
    }

    const { bikeId, startTime, endTime, customerName, customerPhone, customerNid, destination } = req.body;
    if (!bikeId || !startTime || !endTime) {
      return res.status(400).json({ message: 'bikeId, startTime, and endTime are required' });
    }

    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (bike.isUnderMaintenance) {
      return res.status(400).json({ message: 'This bike is currently under maintenance and not available for booking' });
    }

    const pricing = await calculateBookingPrice(bike.pricePerHour, startTime, endTime, bike.packages);

    const result = await createWalkInBooking(bikeId, startTime, endTime, {
      user: req.user.id,
      bike: bikeId,
      startTime,
      endTime,
      totalPrice: pricing.totalPrice,
      advancePaid: pricing.totalPrice,
      advancePercent: 1,
      destination: sanitize(destination) || '',
      securityDeposit: 2000,
      status: 'Confirmed',
      packageName: pricing.packageName,
      termsAccepted: true,
      invoiceNumber: await generateInvoiceNumber(),
      customerName: sanitize(customerName) || '',
      customerPhone: sanitize(customerPhone) || '',
      customerNid: sanitize(customerNid) || '',
    });

    if (!result.success) {
      return res.status(409).json({ message: result.message });
    }

    await createJournalEntry({
      bookingId: result.booking._id,
      source: 'walkin',
      reference: result.booking.invoiceNumber,
      entries: [
        { type: 'debit', account: 'advance_paid', amount: pricing.totalPrice, description: 'Walk-in full payment' },
        { type: 'credit', account: 'total_fare', amount: pricing.totalPrice, description: 'Walk-in total fare' },
      ],
    });

    res.status(201).json({
      message: 'Walk-in booking created',
      booking: result.booking,
      pricing: {
        totalPrice: pricing.totalPrice,
        hours: pricing.hours,
        packageName: pricing.packageName,
      },
    });
  } catch (error) {
    logger.error('createWalkInBooking error', { tag: 'Booking', message: error.message });
    res.status(500).json({ message: 'Walk-in booking failed' });
  }
};
