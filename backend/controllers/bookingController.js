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

const CHECKOUT_TIMEOUT_MS = 5 * 60 * 1000;

exports.createBooking = async (req, res) => {
  try {
    const userDoc = await require('../models/User').findById(req.user.id);
    if (!userDoc || !userDoc.isVerified) {
      return res.status(403).json({ message: 'Account not verified. Please upload your NID and license for admin verification.' });
    }

    const ip = getClientIp(req);
    const fingerprint = buildFingerprint(ip, userDoc.phoneNumber);
    const blocked = await isFingerprintBlocked(fingerprint);
    if (blocked) {
      return res.status(403).json({ message: 'Access temporarily restricted. Contact support.' });
    }

    const { bikeId, startTime, endTime, couponCode, packageIndex, destination } = req.body;
    if (!bikeId || !startTime || !endTime) {
      return res.status(400).json({ message: 'bikeId, startTime, and endTime are required' });
    }

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const pricing = await calculateBookingPrice(bike.pricePerHour, startTime, endTime, packageIndex, bike.packages);

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

      const userUsageCount = couponDoc.usedBy ? couponDoc.usedBy.filter(id => id.toString() === req.user.id).length : 0;
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
    });

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
  } catch (error) {
    console.error('[Booking] createBooking error:', error.message, error.stack);
    res.status(500).json({ message: 'Booking creation failed' });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
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
        booking.paymentStatus = 'Partial';
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
  } catch (error) {
    console.error('[Booking] confirmPayment error:', error.message);
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
  } catch (error) {
    console.error('[Booking] cancelBooking error:', error.message);
    res.status(500).json({ message: 'Booking cancellation failed' });
  }
};

exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phoneNumber address')
      .populate('bike', 'model brand pricePerHour');
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
    console.error('[Booking] getBookingDetails error:', error.message);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('bike', 'model brand pricePerHour images category')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('[Booking] getMyBookings error:', error.message);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

exports.getRenterBookings = async (req, res) => {
  try {
    if (req.user.role !== 'Renter') return res.status(403).json({ message: 'Access denied' });
    const renterBikes = await Bike.find({ renter: req.user.id }).select('_id');
    const bikeIds = renterBikes.map(b => b._id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await Booking.countDocuments({ bike: { $in: bikeIds } });
    const bookings = await Booking.find({ bike: { $in: bikeIds } })
      .skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email phoneNumber')
      .populate('bike', 'model brand pricePerHour')
      .sort({ createdAt: -1 });
    res.json({ bookings, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Booking] getRenterBookings error:', error.message);
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
      .populate('bike', 'model brand pricePerHour')
      .sort({ createdAt: -1 });
    res.json({ bookings, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Booking] getAllBookings error:', error.message);
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
    console.error('[Booking] completeBooking error:', error.message);
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
    console.error('[Booking] heartbeat error:', error.message);
    res.status(500).json({ message: 'Heartbeat failed' });
  }
};

exports.extendBooking = async (req, res) => {
  try {
    const { newEndTime } = req.body;
    if (!newEndTime) return res.status(400).json({ message: 'newEndTime is required' });

    const booking = await Booking.findById(req.params.id);
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

    const bike = await Bike.findById(booking.bike);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const additionalPrice = roundPaisa(multiplyPaisa(additionalHours, bike.pricePerHour));

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
    console.error('[Booking] extendBooking error:', error.message);
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

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const pricing = await calculateBookingPrice(bike.pricePerHour, startTime, endTime);

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
    console.error('[Booking] createWalkInBooking error:', error.message);
    res.status(500).json({ message: 'Walk-in booking failed' });
  }
};
