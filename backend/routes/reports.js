const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/reportController');

router.get('/admin/reports/types', auth, authorize('Admin'), ctrl.getReportTypes);
router.post('/admin/reports/generate', auth, authorize('Admin'), ctrl.generateReport);

module.exports = router;
