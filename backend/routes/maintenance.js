const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  createMaintenanceLog,
  getMaintenanceLogs,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  getMaintenanceStats,
  getRenterMaintenanceOverview,
  getNotifications,
  acknowledgeNotification,
} = require('../controllers/maintenanceController');
const {
  createMaintenanceRules,
  updateMaintenanceRules,
  maintenanceBikeParamRules,
} = require('../security/validators/maintenanceValidator');

router.get('/notifications', auth, getNotifications);
router.put('/notifications/:id/acknowledge', auth, acknowledgeNotification);

router.get('/renter/overview', auth, getRenterMaintenanceOverview);

router.get('/bike/:bikeId', auth, maintenanceBikeParamRules, getMaintenanceLogs);
router.get('/bike/:bikeId/stats', auth, maintenanceBikeParamRules, getMaintenanceStats);
router.post('/', auth, authorize('Renter', 'Admin'), createMaintenanceRules, createMaintenanceLog);
router.put('/:id', auth, authorize('Renter', 'Admin'), updateMaintenanceRules, updateMaintenanceLog);
router.delete('/:id', auth, authorize('Renter', 'Admin'), deleteMaintenanceLog);

module.exports = router;
