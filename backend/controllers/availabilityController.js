const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const MaintenanceLog = require('../models/MaintenanceLog');
const { BUFFER_MINUTES } = require('../utils/pricing');
const logger = require('../utils/logger');

const bufferMs = BUFFER_MINUTES * 60 * 1000;

exports.getBikeAvailability = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { from, to } = req.query;

    const bike = await Bike.findById(bikeId).select('availability isUnderMaintenance').lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    if (!bike.availability || bike.isUnderMaintenance) {
      return res.json({
        available: false,
        reason: bike.isUnderMaintenance ? 'maintenance' : 'unavailable',
        bookedSlots: [],
        maintenanceSlots: [],
      });
    }

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      bike: bikeId,
      status: { $in: ['Pending', 'Confirmed'] },
      startTime: { $lt: toDate },
      endTime: { $gt: fromDate },
    }).select('startTime endTime status').sort({ startTime: 1 }).lean();

    const bookedSlots = bookings.map(b => ({
      start: b.startTime,
      end: b.endTime,
      status: b.status,
      bufferStart: new Date(new Date(b.startTime).getTime() - bufferMs),
      bufferEnd: new Date(new Date(b.endTime).getTime() + bufferMs),
    }));

    const maintenanceLogs = await MaintenanceLog.find({
      bike: bikeId,
      status: { $in: ['in_progress', 'scheduled'] },
      nextServiceDue: { $gte: fromDate, $lte: toDate },
    }).select('performedAt nextServiceDue type title').sort({ performedAt: 1 }).lean();

    const maintenanceSlots = maintenanceLogs.map(m => ({
      start: m.performedAt,
      end: m.nextServiceDue || m.performedAt,
      type: m.type,
      title: m.title,
    }));

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayBooked = bookings.some(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < todayEnd && bEnd > todayStart;
    });

    let availabilityStatus = 'available';
    if (todayBooked) availabilityStatus = 'booked_today';
    if (bike.isUnderMaintenance) availabilityStatus = 'maintenance';

    res.json({
      available: bike.availability && !bike.isUnderMaintenance,
      availabilityStatus,
      bookedSlots,
      maintenanceSlots,
      bufferMinutes: BUFFER_MINUTES,
    });
  } catch (error) {
    logger.error('getBikeAvailability error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch availability' });
  }
};

exports.getAvailabilityForRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      status: { $in: ['Pending', 'Confirmed'] },
      startTime: { $lt: toDate },
      endTime: { $gt: fromDate },
    }).select('bike startTime endTime status').sort({ startTime: 1 }).lean();

    const bikeAvailability = {};
    for (const b of bookings) {
      const bikeId = b.bike.toString();
      if (!bikeAvailability[bikeId]) {
        bikeAvailability[bikeId] = { bookedSlots: [], count: 0 };
      }
      bikeAvailability[bikeId].bookedSlots.push({
        start: b.startTime,
        end: b.endTime,
        status: b.status,
      });
      bikeAvailability[bikeId].count++;
    }

    const result = {};
    for (const [bikeId, data] of Object.entries(bikeAvailability)) {
      const hasConflict = data.bookedSlots.some(slot => {
        const slotStart = new Date(slot.start).getTime() - bufferMs;
        const slotEnd = new Date(slot.end).getTime() + bufferMs;
        return slotStart < toDate.getTime() && slotEnd > fromDate.getTime();
      });
      result[bikeId] = {
        available: !hasConflict,
        bookedCount: data.count,
      };
    }

    res.json(result);
  } catch (error) {
    logger.error('getAvailabilityForRange error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch availability for range' });
  }
};

exports.getBikeAvailabilityHistory = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const total = await Booking.countDocuments({
      bike: bikeId,
      status: { $in: ['Pending', 'Confirmed', 'Completed'] },
    });

    const bookings = await Booking.find({
      bike: bikeId,
      status: { $in: ['Pending', 'Confirmed', 'Completed'] },
    })
      .select('startTime endTime status user')
      .populate('user', 'name')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ bookings, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('getBikeAvailabilityHistory error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch availability history' });
  }
};
