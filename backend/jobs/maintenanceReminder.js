const Bike = require('../models/Bike');
const MaintenanceNotification = require('../models/MaintenanceNotification');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function runMaintenanceReminder() {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const now = new Date();
    const upcoming = new Date(now.getTime() + THREE_DAYS_MS);

    const bikesNeedingService = await Bike.find({
      nextServiceDue: { $lte: upcoming, $gte: now },
      isUnderMaintenance: false,
    }).select('_id model brand renter nextServiceDue currentMileage nextServiceMileage');

    for (const bike of bikesNeedingService) {
      const existing = await MaintenanceNotification.findOne({
        bike: bike._id,
        type: 'service_due',
        acknowledged: false,
        dueDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      });

      if (!existing) {
        await MaintenanceNotification.create({
          bike: bike._id,
          renter: bike.renter,
          type: 'service_due',
          message: `Service due for ${bike.brand} ${bike.model} by ${bike.nextServiceDue.toLocaleDateString()}`,
          dueDate: bike.nextServiceDue,
        });
        logger.info('Maintenance reminder created', { bikeId: bike._id.toString(), dueDate: bike.nextServiceDue });
      }
    }

    const overdueBikes = await Bike.find({
      nextServiceDue: { $lt: now },
      isUnderMaintenance: false,
    }).select('_id model brand renter nextServiceDue');

    for (const bike of overdueBikes) {
      const existing = await MaintenanceNotification.findOne({
        bike: bike._id,
        type: 'service_overdue',
        acknowledged: false,
      });

      if (!existing) {
        await MaintenanceNotification.create({
          bike: bike._id,
          renter: bike.renter,
          type: 'service_overdue',
          message: `OVERDUE: Service required for ${bike.brand} ${bike.model} (was due ${bike.nextServiceDue.toLocaleDateString()})`,
          dueDate: bike.nextServiceDue,
        });
        logger.warn('Overdue maintenance notification', { bikeId: bike._id.toString() });
      }
    }

    if (bikesNeedingService.length > 0 || overdueBikes.length > 0) {
      logger.info('Maintenance reminder run complete', {
        upcoming: bikesNeedingService.length,
        overdue: overdueBikes.length,
      });
    }
  } catch (error) {
    logger.error('Maintenance reminder job error', { error: error.message });
  }
}

function startMaintenanceReminder() {
  setInterval(runMaintenanceReminder, 12 * 60 * 60 * 1000);
  runMaintenanceReminder();
  logger.info('Maintenance reminder job started (interval: 12h)');
}

module.exports = { startMaintenanceReminder, runMaintenanceReminder };
