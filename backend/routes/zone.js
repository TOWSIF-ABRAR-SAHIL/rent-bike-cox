const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  createZone, getZones, getActiveZones, getZoneById,
  updateZone, deleteZone, getZoneStats,
} = require('../controllers/zoneController');

router.get('/', getZones);
router.get('/active', getActiveZones);
router.get('/:id', getZoneById);
router.get('/:id/stats', auth, authorize('Admin'), getZoneStats);
router.post('/', auth, authorize('Admin'), createZone);
router.put('/:id', auth, authorize('Admin'), updateZone);
router.delete('/:id', auth, authorize('Admin'), deleteZone);

module.exports = router;
