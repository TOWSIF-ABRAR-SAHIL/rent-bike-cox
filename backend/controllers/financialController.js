const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const LedgerEntry = require('../models/LedgerEntry');
const FraudEvent = require('../models/FraudEvent');
const { getBookingLedger, getDailySummary, verifyLedgerBalance } = require('../utils/ledger');
const { getCircuitBreakerStatus, unlockCircuitBreaker } = require('../utils/circuitBreaker');
const { getVelocityReport } = require('../utils/fraud');
const logger = require('../utils/logger');

exports.getCircuitBreaker = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const status = await getCircuitBreakerStatus();
    res.json(status);
  } catch (error) {
    logger.error('getCircuitBreaker error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch circuit breaker status' });
  }
};

exports.unlockCircuitBreaker = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const result = await unlockCircuitBreaker(req.user.id);
    if (!result) {
      return res.status(400).json({ message: 'No tripped circuit breaker found for today' });
    }
    res.json({ message: 'Circuit breaker unlocked', breaker: result });
  } catch (error) {
    logger.error('unlockCircuitBreaker error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to unlock circuit breaker' });
  }
};

exports.getBookingLedger = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

    const entries = await getBookingLedger(bookingId);
    const balance = await verifyLedgerBalance(bookingId);

    res.json({ entries, balance });
  } catch (error) {
    logger.error('getBookingLedger error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch booking ledger' });
  }
};

exports.getDailyFinancialSummary = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const summary = await getDailySummary(date);
    res.json({ date: date.toISOString().split('T')[0], summary });
  } catch (error) {
    logger.error('getDailySummary error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch daily summary' });
  }
};

exports.getFraudReport = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { ip, phone, hours } = req.query;
    const report = await getVelocityReport(ip, phone, parseInt(hours) || 24);
    res.json(report);
  } catch (error) {
    logger.error('getFraudReport error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch fraud report' });
  }
};

exports.getFraudEvents = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { severity, eventType } = req.query;

    const filter = {};
    if (severity) filter.severity = severity;
    if (eventType) filter.eventType = eventType;

    const total = await FraudEvent.countDocuments(filter);
    const events = await FraudEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ events, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getFraudEvents error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch fraud events' });
  }
};

exports.getRenterEarnings = async (req, res) => {
  try {
    if (req.user.role !== 'Renter' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const renterBikes = await Bike.find({ renter: req.user.id }).select('_id model brand').lean();
    const bikeIds = renterBikes.map(b => b._id);

    if (bikeIds.length === 0) {
      return res.json({ totalEarnings: 0, completedBookings: 0, avgPerBooking: 0, pendingPayout: 0, byVehicle: [] });
    }

    const completed = await Booking.find({
      bike: { $in: bikeIds },
      status: 'Completed',
      createdAt: { $gte: since },
    }).lean();

    const totalEarnings = completed.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const completedBookings = completed.length;
    const avgPerBooking = completedBookings > 0 ? Math.round(totalEarnings / completedBookings) : 0;

    const pendingPayoutAgg = await Booking.aggregate([
      { $match: { bike: { $in: bikeIds }, status: 'Completed', createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
    ]);
    const pendingPayout = pendingPayoutAgg[0]?.total || 0;

    const byVehicle = await Booking.aggregate([
      { $match: { bike: { $in: bikeIds }, status: 'Completed', createdAt: { $gte: since } } },
      { $group: { _id: '$bike', bookings: { $sum: 1 }, earnings: { $sum: '$totalPrice' } } },
      {
        $lookup: { from: 'bikes', localField: '_id', foreignField: '_id', as: 'bike' },
      },
      { $unwind: '$bike' },
      { $project: { _id: 1, model: '$bike.model', brand: '$bike.brand', bookings: 1, earnings: 1 } },
      { $sort: { earnings: -1 } },
    ]);

    res.json({ totalEarnings, completedBookings, avgPerBooking, pendingPayout, byVehicle });
  } catch (error) {
    logger.error('getRenterEarnings error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
};

exports.getFinancialOverview = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayBookings, weekBookings, totalBookings, circuitBreaker, recentFraud] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ createdAt: { $gte: weekAgo } }),
      Booking.countDocuments(),
      getCircuitBreakerStatus(),
      FraudEvent.countDocuments({ createdAt: { $gte: todayStart } }),
    ]);

    const [todayRevenue, weekRevenue] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $in: ['Confirmed', 'Completed'] } } },
        { $group: { _id: null, total: { $sum: '$advancePaid' }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: weekAgo }, status: { $in: ['Confirmed', 'Completed'] } } },
        { $group: { _id: null, total: { $sum: '$advancePaid' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      today: {
        bookings: todayBookings,
        revenue: todayRevenue[0]?.total || 0,
        confirmedPayments: todayRevenue[0]?.count || 0,
      },
      week: {
        bookings: weekBookings,
        revenue: weekRevenue[0]?.total || 0,
        confirmedPayments: weekRevenue[0]?.count || 0,
      },
      totalBookings,
      circuitBreaker,
      fraudEventsToday: recentFraud,
    });
  } catch (error) {
    logger.error('getFinancialOverview error', { tag: 'Financial', message: error.message });
    res.status(500).json({ message: 'Failed to fetch financial overview' });
  }
};
