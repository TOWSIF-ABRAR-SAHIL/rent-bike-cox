const ReportHistory = require('../models/ReportHistory');
const logger = require('../utils/logger');

/**
 * Record a generated report exactly once.
 *
 * The previous version patched `res.send` *and* `res.setHeader` and wrote a history row
 * from each, so every download produced two rows — the duplicate missing its fileSize,
 * which the admin list then rendered as "—". Sending the body is now the single trigger,
 * and it only fires when the controller published what it built on `res.locals.report`
 * (see reportController.generateReport). A response without that record — a validation
 * or server error — writes nothing at all.
 *
 * Reporting a failure must never be able to fail the request, hence the silent catch.
 */
function recordReportGeneration(req, res, next) {
  const originalSend = res.send.bind(res);

  res.send = function send(body) {
    const report = res.locals.report;
    if (report && res.statusCode >= 200 && res.statusCode < 300) {
      ReportHistory.create({
        reportType: report.reportType,
        format: report.format,
        dateRange: report.dateRange,
        rowCount: report.rowCount,
        fileSize: body?.length ? `${(body.length / 1024).toFixed(1)} KB` : '—',
        generatedBy: req.user?.id,
      }).catch(err => logger.warn('Report history not recorded', { error: err.message }));
    }
    return originalSend(body);
  };

  next();
}

module.exports = { recordReportGeneration };
