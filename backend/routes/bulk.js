const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const {
  bulkUpdateStatus,
  bulkScheduleMaintenance,
  bulkExportSelected,
  bulkDelete,
} = require('../controllers/bulkController');

router.post('/status', auth, authorize('Renter', 'Admin'), bulkUpdateStatus);
router.post('/maintenance', auth, authorize('Renter', 'Admin'), bulkScheduleMaintenance);
router.post('/export-selected', auth, authorize('Renter', 'Admin'), bulkExportSelected);
router.post('/delete', auth, authorize('Renter', 'Admin'), bulkDelete);

module.exports = router;
