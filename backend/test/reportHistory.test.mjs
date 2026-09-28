import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ReportHistory = require('../models/ReportHistory');
const { recordReportGeneration } = require('../middleware/reportHistory');

// The old handler patched both res.send and res.setHeader and wrote a row from each, so
// one download produced two history rows (the second without a fileSize, which the admin
// list rendered as "—"). These tests pin the single-trigger behaviour.
function fakeResponse() {
  return {
    locals: {},
    statusCode: 200,
    headers: {},
    send(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
  };
}

function runMiddleware(res, req = { user: { id: 'admin-1' } }) {
  let called = false;
  recordReportGeneration(req, res, () => { called = true; });
  expect(called).toBe(true);
  return res;
}

describe('report history recording', () => {
  let create;

  beforeEach(() => {
    create = vi.spyOn(ReportHistory, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records one row for one generated report', () => {
    const res = runMiddleware(fakeResponse());
    res.locals.report = { reportType: 'bookings', format: 'pdf', rowCount: 32, dateRange: { from: 'a', to: 'b' } };

    res.setHeader('Content-Disposition', 'attachment; filename="bookings.pdf"');
    res.send(Buffer.alloc(2048));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      reportType: 'bookings',
      format: 'pdf',
      rowCount: 32,
      fileSize: '2.0 KB',
      generatedBy: 'admin-1',
    });
  });

  it('records the row count and file size rather than a default zero', () => {
    const res = runMiddleware(fakeResponse());
    res.locals.report = { reportType: 'revenue', format: 'csv', rowCount: 7, dateRange: {} };

    res.send('Date,Bookings\n2026-09-18,7\n');

    const row = create.mock.calls[0][0];
    expect(row.rowCount).toBe(7);
    expect(row.fileSize).not.toBe('—');
    expect(row.fileSize).toMatch(/KB$/);
  });

  it('writes nothing when the controller never published a report', () => {
    const res = runMiddleware(fakeResponse());

    res.setHeader('Content-Disposition', 'attachment; filename="x.csv"');
    res.send(JSON.stringify({ message: 'Report type is required' }));

    expect(create).not.toHaveBeenCalled();
  });

  it('writes nothing for a failed response even if a report was published', () => {
    const res = runMiddleware(fakeResponse());
    res.statusCode = 500;
    res.locals.report = { reportType: 'bookings', format: 'pdf', rowCount: 0 };

    res.send('boom');

    expect(create).not.toHaveBeenCalled();
  });

  it('does not patch setHeader, so headers alone cannot record a row', () => {
    const res = runMiddleware(fakeResponse());
    const originalSetHeader = res.setHeader;

    res.setHeader('Content-Disposition', 'attachment; filename="x.pdf"');

    expect(res.setHeader).toBe(originalSetHeader);
    expect(create).not.toHaveBeenCalled();
  });

  it('never fails the request when recording fails', async () => {
    create.mockRejectedValue(new Error('mongo down'));
    const res = runMiddleware(fakeResponse());
    res.locals.report = { reportType: 'bookings', format: 'csv', rowCount: 1 };

    expect(() => res.send('a,b\n1,2\n')).not.toThrow();

    // The rejection is swallowed by the middleware's own catch; flush it so vitest
    // does not report an unhandled rejection.
    await Promise.resolve();
  });
});
