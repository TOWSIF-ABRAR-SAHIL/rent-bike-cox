const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

async function runDataRetention() {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const cutoff = new Date(Date.now() - TWO_YEARS_MS);
    const inactiveUsers = await User.find({
      role: 'User',
      date: { $lt: cutoff },
      email: { $not: { $regex: /^deleted_/ } },
    }).select('_id email');

    for (const user of inactiveUsers) {
      const hasBookings = await Booking.countDocuments({ user: user._id });
      if (hasBookings === 0) {
        user.email = `deleted_${user._id}@deleted.invalid`;
        user.name = 'Deleted User';
        user.phoneNumber = '';
        user.nid = '';
        user.license = '';
        user.address = '';
        user.isVerified = false;
        await user.save();
        logger.info('Anonymized inactive user', { userId: user._id.toString() });
      }
    }
  } catch (error) {
    logger.error('Data retention job error', { error: error.message });
  }
}

function startDataRetention() {
  setInterval(runDataRetention, 24 * 60 * 60 * 1000);
  logger.info('Data retention job started (interval: 24h)');
}

module.exports = { startDataRetention, runDataRetention };
