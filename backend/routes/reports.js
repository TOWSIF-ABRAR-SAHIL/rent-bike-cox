const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/reportController');
const ReportHistory = require('../models/ReportHistory');

router.get('/admin/reports/types', auth, authorize('Admin'), ctrl.getReportTypes);
router.post('/admin/reports/generate', auth, authorize('Admin'), async (req, res, next) => {
  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);
  const origSetHeader = res.setHeader.bind(res);

  res.json = function (body) { return origJson(body); };
  res.send = function (body) {
    ReportHistory.create({
      reportType: req.body.type,
      format: req.body.format || 'csv',
      dateRange: { from: req.body.from, to: req.body.to },
      fileSize: body?.length ? `${(body.length / 1024).toFixed(1)} KB` : '—',
      generatedBy: req.user?.id,
    }).catch(() => {});
    return origSend(body);
  };
  res.setHeader = function (name, value) {
    if (name === 'Content-Disposition') {
      ReportHistory.create({
        reportType: req.body.type,
        format: req.body.format || 'csv',
        dateRange: { from: req.body.from, to: req.body.to },
        generatedBy: req.user?.id,
      }).catch(() => {});
    }
    return origSetHeader(name, value);
  };

  ctrl.generateReport(req, res, next);
});

router.get('/admin/reports/history', auth, authorize('Admin'), async (req, res) => {
  const reports = await ReportHistory.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ reports });
});

router.delete('/admin/reports/history/:id', auth, authorize('Admin'), async (req, res) => {
  await ReportHistory.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
