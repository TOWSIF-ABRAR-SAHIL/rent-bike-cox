const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const { paginationRules } = require('../security/validators');
const { recordReportGeneration } = require('../middleware/reportHistory');
const ctrl = require('../controllers/reportController');
const ReportHistory = require('../models/ReportHistory');

router.get('/admin/reports/types', auth, authorize('Admin'), ctrl.getReportTypes);
router.post('/admin/reports/generate', auth, authorize('Admin'), recordReportGeneration, ctrl.generateReport);

router.get('/admin/reports/history', auth, authorize('Admin'), paginationRules, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const [reports, total] = await Promise.all([
    ReportHistory.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ReportHistory.countDocuments(),
  ]);

  res.json({ reports, page, pages: Math.max(1, Math.ceil(total / limit)), total, limit });
});

router.delete('/admin/reports/history/:id', auth, authorize('Admin'), async (req, res) => {
  await ReportHistory.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
