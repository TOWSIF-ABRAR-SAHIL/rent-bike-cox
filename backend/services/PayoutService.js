const mongoose = require('mongoose');
const Payout = require('../models/Payout');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const { generatePayoutId } = require('../utils/generators');
const { createJournalEntry } = require('../utils/ledger');
const NotificationService = require('./NotificationService');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

class PayoutService {
  async calculateRenterPayout({ renterId, periodStart, periodEnd }) {
    const bookings = await Booking.find({
      status: 'Completed',
      bike: { $exists: true },
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).populate({ path: 'bike', select: 'renter', match: { renter: renterId } });

    const renterBookings = bookings.filter(b => b.bike && b.bike.renter?.toString() === renterId);
    if (renterBookings.length === 0) return null;

    const settings = await Settings.findOne();
    const commissionPercent = settings?.adminCommissionPercent || 10;

    let totalAmount = 0;
    const bookingIds = [];

    for (const booking of renterBookings) {
      totalAmount += booking.totalPrice;
      bookingIds.push(booking._id);
    }

    const platformFee = Math.round(totalAmount * commissionPercent / 100);
    const netAmount = totalAmount - platformFee;

    return { totalAmount, platformFee, netAmount, bookingCount: renterBookings.length, bookingIds };
  }

  async schedulePayouts({ periodStart, periodEnd, correlationId }) {
    const renters = await Booking.distinct('bike', {
      status: 'Completed',
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    const Bike = require('../models/Bike');
    const renterIds = new Set();
    for (const bikeId of renters) {
      const bike = await Bike.findById(bikeId).select('renter');
      if (bike?.renter) renterIds.add(bike.renter.toString());
    }

    const payouts = [];
    for (const renterId of renterIds) {
      const calc = await this.calculateRenterPayout({ renterId, periodStart, periodEnd });
      if (!calc || calc.netAmount <= 0) continue;

      const payoutId = await generatePayoutId();
      const payout = await Payout.create({
        payoutId,
        renterId,
        totalAmountPaisa: calc.totalAmount,
        platformFeePaisa: calc.platformFee,
        netAmountPaisa: calc.netAmount,
        periodStart,
        periodEnd,
        bookingCount: calc.bookingCount,
        bookings: calc.bookingIds,
        status: 'PENDING',
        correlationId,
      });

      payouts.push(payout);
      bus.emit('payout.scheduled', { payoutId, renterId, netAmount: calc.netAmount, correlationId });
    }

    logger.info('Payouts scheduled', { count: payouts.length, periodStart, periodEnd });
    return payouts;
  }

  async approvePayout({ payoutId, processedBy }) {
    const payout = await Payout.findOne({ payoutId });
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'PENDING') throw new Error(`Cannot approve payout in status: ${payout.status}`);

    payout.status = 'APPROVED';
    payout.processedBy = processedBy;
    payout.processedAt = new Date();
    await payout.save();

    bus.emit('payout.approved', { payoutId, processedBy });
    return payout;
  }

  async markPayoutPaid({ payoutId, paymentReference }) {
    const payout = await Payout.findOne({ payoutId });
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'APPROVED') throw new Error(`Cannot mark payout as paid in status: ${payout.status}`);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        payout.status = 'PAID';
        payout.paymentReference = paymentReference;
        payout.processedAt = new Date();
        await payout.save({ session });

        await createJournalEntry({
          bookingId: payout.bookings[0],
          source: 'payout',
          reference: payoutId,
          entries: [
            { type: 'debit', account: 'payout_receivable', amount: payout.netAmountPaisa, description: `Payout to renter` },
            { type: 'credit', account: 'cash', amount: payout.netAmountPaisa, description: `Payout ${payoutId}` },
          ],
        });
      });
    } finally {
      await session.endSession();
    }

    await NotificationService.notifyPayoutReady({
      renterId: payout.renterId,
      payoutId,
      amount: payout.netAmountPaisa,
      correlationId: payout.correlationId,
    });

    bus.emit('payout.completed', { payoutId, renterId: payout.renterId.toString() });
    logger.info('Payout completed', { payoutId, amount: payout.netAmountPaisa });

    return payout;
  }

  async getPayoutsForRenter(renterId) {
    return Payout.find({ renterId }).sort({ createdAt: -1 });
  }

  async getPendingPayouts() {
    return Payout.find({ status: 'PENDING' }).sort({ createdAt: 1 });
  }
}

module.exports = new PayoutService();
