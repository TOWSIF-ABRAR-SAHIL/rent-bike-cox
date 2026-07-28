const Booking = require('../models/Booking');
const User = require('../models/User');
const Bike = require('../models/Bike');
const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');

function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

exports.generateReport = async (req, res) => {
  try {
    const { type, format = 'csv', dateRange } = req.body;
    if (!type) return res.status(400).json({ message: 'Report type is required' });

    const start = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end ? new Date(dateRange.end) : new Date();
    end.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: start, $lte: end } };
    let headers = [];
    let rows = [];

    switch (type) {
      case 'bookings': {
        const bookings = await Booking.find(dateFilter).populate('bike', 'model brand').populate('user', 'name email').lean();
        headers = ['Invoice #', 'Customer', 'Email', 'Vehicle', 'Start', 'End', 'Total (TK)', 'Status', 'Payment', 'Created'];
        rows = bookings.map(b => [
          b.invoiceNumber || b._id,
          b.user?.name || 'N/A',
          b.user?.email || 'N/A',
          b.bike ? `${b.bike.brand} ${b.bike.model}` : 'N/A',
          b.startTime ? new Date(b.startTime).toLocaleDateString('en-BD') : '',
          b.endTime ? new Date(b.endTime).toLocaleDateString('en-BD') : '',
          b.totalPrice || b.totalAmount || 0,
          b.status || '',
          b.paymentStatus || '',
          b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-BD') : ''
        ]);
        break;
      }
      case 'revenue': {
        const bookings = await Booking.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }).lean();
        const grouped = {};
        bookings.forEach(b => {
          const date = new Date(b.createdAt).toISOString().split('T')[0];
          if (!grouped[date]) grouped[date] = { date, total: 0, count: 0 };
          grouped[date].total += b.totalPrice || b.totalAmount || 0;
          grouped[date].count++;
        });
        headers = ['Date', 'Bookings', 'Revenue (TK)', 'Avg (TK)'];
        rows = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
          .map(g => [g.date, g.count, g.total, Math.round(g.total / g.count)]);
        break;
      }
      case 'users': {
        const users = await User.find({ createdAt: { $gte: start, $lte: end } }).lean();
        headers = ['Name', 'Email', 'Role', 'Phone', 'Verified', 'Joined'];
        rows = users.map(u => [
          u.name, u.email, u.role, u.phoneNumber || '',
          u.isVerified ? 'Yes' : 'No',
          new Date(u.createdAt).toLocaleDateString('en-BD')
        ]);
        break;
      }
      case 'cancellations': {
        const bookings = await Booking.find({ ...dateFilter, status: 'Cancelled' }).populate('bike', 'model brand').lean();
        headers = ['Invoice #', 'Vehicle', 'Start', 'End', 'Total (TK)', 'Cancelled At'];
        rows = bookings.map(b => [
          b.invoiceNumber || b._id,
          b.bike ? `${b.bike.brand} ${b.bike.model}` : 'N/A',
          b.startTime ? new Date(b.startTime).toLocaleDateString('en-BD') : '',
          b.endTime ? new Date(b.endTime).toLocaleDateString('en-BD') : '',
          b.totalPrice || b.totalAmount || 0,
          b.cancellationAt ? new Date(b.cancellationAt).toLocaleDateString('en-BD') : ''
        ]);
        break;
      }
      case 'coupons': {
        const coupons = await Coupon.find({ createdAt: { $gte: start, $lte: end } }).lean();
        headers = ['Code', 'Discount %', 'Uses', 'Max Uses', 'Expiry', 'Active'];
        rows = coupons.map(c => [
          c.code, c.discountPercent, c.usedCount, c.maxUses || 'Unlimited',
          c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-BD') : '',
          c.isActive ? 'Yes' : 'No'
        ]);
        break;
      }
      default:
        return res.status(400).json({ message: `Unknown report type: ${type}. Available: bookings, revenue, users, cancellations, coupons` });
    }

    if (format === 'csv') {
      const csv = toCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    res.json({ type, dateRange: { start, end }, headers, rows, total: rows.length });
  } catch (error) {
    logger.error('generateReport error:', error.message);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};

exports.getReportTypes = async (_req, res) => {
  res.json({
    types: [
      { key: 'bookings', label: 'Bookings Report' },
      { key: 'revenue', label: 'Revenue Report' },
      { key: 'users', label: 'User Registrations' },
      { key: 'cancellations', label: 'Cancellations' },
      { key: 'coupons', label: 'Coupon Usage' }
    ]
  });
};
