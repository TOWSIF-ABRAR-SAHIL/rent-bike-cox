const Booking = require('../models/Booking');
const User = require('../models/User');
const Bike = require('../models/Bike');
const Coupon = require('../models/Coupon');
const Category = require('../models/Category');
const Refund = require('../models/Refund');
const Payout = require('../models/Payout');
const logger = require('../utils/logger');
const { generatePDF } = require('../utils/pdfGenerator');
const { generateXLSX } = require('../utils/xlsxGenerator');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

function fmt(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

const REPORT_META = {
  bookings: { label: 'Bookings Report', description: 'All bookings with status, amounts, dates' },
  revenue: { label: 'Revenue Report', description: 'Revenue breakdown by period' },
  users: { label: 'Users Report', description: 'User registrations and activity' },
  cancellations: { label: 'Cancellations Report', description: 'Cancelled bookings with reasons' },
  coupons: { label: 'Coupons Report', description: 'Coupon usage and discounts' },
  fleet: { label: 'Fleet Report', description: 'Vehicle fleet utilization and status' },
  maintenance: { label: 'Maintenance Report', description: 'Maintenance logs and costs' },
  payments: { label: 'Payment Report', description: 'Payment transactions and failures' },
  'renter-earnings': { label: 'Renter Earnings Report', description: 'Renter earnings with commission breakdown' },
  'vehicle-utilization': { label: 'Vehicle Utilization Report', description: 'Bike usage rates and revenue per vehicle' },
  'category-performance': { label: 'Category Performance Report', description: 'Revenue and bookings by category' },
  'zone-analytics': { label: 'Zone Analytics Report', description: 'Bookings and revenue by pickup zone' },
  'daily-summary': { label: 'Daily Summary Report', description: 'Daily bookings, revenue and new users' },
  'monthly-financial': { label: 'Monthly Financial Statement', description: 'Monthly revenue, refunds and net income' },
  'tax-vat': { label: 'Tax/VAT Report', description: '15% VAT calculation on revenue' },
  'customer-insights': { label: 'Customer Insights Report', description: 'Top customers by spending and frequency' },
  'peak-hours': { label: 'Peak Hours Analysis', description: 'Booking volume and revenue by hour of day' },
  refunds: { label: 'Refunds Report', description: 'All refunds with amounts and reasons' },
};

const REPORT_GROUPS = {
  revenue: 'financial',
  payments: 'financial',
  refunds: 'financial',
  'monthly-financial': 'financial',
  'tax-vat': 'financial',
  'renter-earnings': 'financial',
  bookings: 'operations',
  cancellations: 'operations',
  'vehicle-utilization': 'operations',
  fleet: 'operations',
  maintenance: 'operations',
  'peak-hours': 'operations',
  users: 'user',
  'customer-insights': 'user',
  coupons: 'user',
  'category-performance': 'analytics',
  'zone-analytics': 'analytics',
  'daily-summary': 'analytics',
};

exports.generateReport = async (req, res) => {
  try {
    const { type, format = 'csv', from, to } = req.body;
    if (!type) return res.status(400).json({ message: 'Report type is required' });

    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: start, $lte: end } };
    let title = REPORT_META[type]?.label || type;
    let headers = [];
    let rows = [];

    switch (type) {
      case 'bookings': {
        const bookings = await Booking.find(dateFilter).populate('bike', 'model brand').populate('user', 'name email').lean();
        headers = ['Invoice #', 'Customer', 'Email', 'Vehicle', 'Start', 'End', 'Total (TK)', 'Status', 'Payment', 'Created'];
        rows = bookings.map(b => [
          b.invoiceNumber || b._id, b.user?.name || 'N/A', b.user?.email || 'N/A',
          b.bike ? `${b.bike.brand} ${b.bike.model}` : 'N/A',
          b.startTime ? new Date(b.startTime).toLocaleDateString('en-BD') : '',
          b.endTime ? new Date(b.endTime).toLocaleDateString('en-BD') : '',
          b.totalPrice || b.totalAmount || 0, b.status || '', b.paymentStatus || '',
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
        rows = users.map(u => [u.name, u.email, u.role, u.phoneNumber || '', u.isVerified ? 'Yes' : 'No', new Date(u.createdAt).toLocaleDateString('en-BD')]);
        break;
      }
      case 'cancellations': {
        const bookings = await Booking.find({ ...dateFilter, status: 'Cancelled' }).populate('bike', 'model brand').populate('user', 'name email').lean();
        headers = ['Invoice #', 'Customer', 'Vehicle', 'Total (TK)', 'Reason', 'Cancelled At'];
        rows = bookings.map(b => [
          b.invoiceNumber || b._id, b.user?.name || 'N/A',
          b.bike ? `${b.bike.brand} ${b.bike.model}` : 'N/A',
          b.totalPrice || b.totalAmount || 0, b.cancellationReason || '', b.cancellationAt ? new Date(b.cancellationAt).toLocaleDateString('en-BD') : ''
        ]);
        break;
      }
      case 'coupons': {
        const coupons = await Coupon.find({ createdAt: { $gte: start, $lte: end } }).lean();
        headers = ['Code', 'Discount %', 'Uses', 'Max Uses', 'Expiry', 'Active'];
        rows = coupons.map(c => [c.code, c.discountPercent, c.usedCount, c.maxUses || 'Unlimited', c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-BD') : '', c.isActive ? 'Yes' : 'No']);
        break;
      }
      case 'fleet': {
        const bikes = await Bike.find().populate('category', 'name').lean();
        headers = ['Model', 'Brand', 'Category', 'Status', 'Condition', 'Price/hr (TK)', 'Renter'];
        rows = bikes.map(b => [
          b.model, b.brand, b.category?.name || 'N/A',
          b.isUnderMaintenance ? 'Maintenance' : b.availability ? 'Available' : 'Booked',
          b.condition, b.pricePerHour, b.renter || 'N/A'
        ]);
        break;
      }
      case 'maintenance': {
        const MaintenanceLog = require('../models/MaintenanceLog');
        const logs = await MaintenanceLog.find({ createdAt: { $gte: start, $lte: end } }).populate('bike', 'model brand').lean();
        headers = ['Vehicle', 'Type', 'Description', 'Cost (TK)', 'Status', 'Date'];
        rows = logs.map(l => [
          l.bike ? `${l.bike.brand} ${l.bike.model}` : 'N/A',
          l.maintenanceType || l.type || '', l.description || '',
          l.cost || l.costAmount || 0, l.status || '', new Date(l.createdAt).toLocaleDateString('en-BD')
        ]);
        break;
      }
      case 'payments': {
        const PaymentIntent = require('../models/PaymentIntent');
        const payments = await PaymentIntent.find(dateFilter).lean();
        headers = ['Tran ID', 'Amount (TK)', 'Currency', 'Status', 'Method', 'Date'];
        rows = payments.map(p => [
          p.tranId || p._id, p.amount || 0, p.currency || 'BDT',
          p.status || '', p.paymentMethod || '', p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-BD') : ''
        ]);
        break;
      }
      case 'renter-earnings': {
        const payouts = await Payout.find({ createdAt: { $gte: start, $lte: end } }).populate('renterId', 'name email').lean();
        headers = ['Renter', 'Email', 'Period Start', 'Period End', 'Gross (TK)', 'Commission (TK)', 'Net (TK)', 'Bookings', 'Status'];
        rows = payouts.map(p => [
          p.renterId?.name || 'N/A', p.renterId?.email || 'N/A',
          p.periodStart ? new Date(p.periodStart).toLocaleDateString('en-BD') : '',
          p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('en-BD') : '',
          p.totalAmountPaisa || 0, p.platformFeePaisa || 0, p.netAmountPaisa || 0,
          p.bookingCount || 0, p.status || ''
        ]);
        break;
      }
      case 'vehicle-utilization': {
        const bikes = await Bike.find().lean();
        const allBookings = await Booking.find({ status: { $in: ['Confirmed', 'Completed'] } }).lean();
        headers = ['Model', 'Brand', 'Total Bookings', 'Total Hours', 'Revenue (TK)', 'Utilization %'];
        rows = bikes.map(b => {
          const bkgs = allBookings.filter(bb => String(bb.bike) === String(b._id));
          const totalHours = bkgs.reduce((sum, bb) => {
            const hours = (new Date(bb.endTime) - new Date(bb.startTime)) / 3600000;
            return sum + Math.max(0, hours);
          }, 0);
          const revenue = bkgs.reduce((sum, bb) => sum + (bb.totalPrice || bb.totalAmount || 0), 0);
          const utilPct = bkgs.length > 0 ? Math.min(100, Math.round((totalHours / (30 * 24)) * 100)) : 0;
          return [b.model, b.brand, bkgs.length, Math.round(totalHours), revenue, `${utilPct}%`];
        });
        break;
      }
      case 'category-performance': {
        const categories = await Category.find().lean();
        const bikes = await Bike.find().populate('category', 'name').lean();
        const bookings = await Booking.find({ status: { $in: ['Confirmed', 'Completed'] } }).populate('bike', 'category').lean();
        headers = ['Category', 'Total Bikes', 'Total Bookings', 'Revenue (TK)', 'Avg Rating'];
        rows = categories.map(cat => {
          const catBikes = bikes.filter(b => String(b.category?._id) === String(cat._id));
          const catBikeIds = catBikes.map(b => String(b._id));
          const catBookings = bookings.filter(b => catBikeIds.includes(String(b.bike?._id)));
          const revenue = catBookings.reduce((sum, b) => sum + (b.totalPrice || b.totalAmount || 0), 0);
          return [cat.name, catBikes.length, catBookings.length, revenue, '—'];
        });
        break;
      }
      case 'zone-analytics': {
        const bookings = await Booking.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }).lean();
        const zones = {};
        bookings.forEach(b => {
          const zone = b.pickupLocation || b.destination || 'Unknown';
          if (!zones[zone]) zones[zone] = { zone, count: 0, revenue: 0 };
          zones[zone].count++;
          zones[zone].revenue += b.totalPrice || b.totalAmount || 0;
        });
        headers = ['Zone', 'Bookings', 'Revenue (TK)'];
        rows = Object.values(zones).sort((a, b) => b.count - a.count).map(z => [z.zone, z.count, z.revenue]);
        break;
      }
      case 'daily-summary': {
        const bookings = await Booking.find(dateFilter).lean();
        const users = await User.find({ createdAt: { $gte: start, $lte: end } }).lean();
        const grouped = {};
        bookings.forEach(b => {
          const date = new Date(b.createdAt).toISOString().split('T')[0];
          if (!grouped[date]) grouped[date] = { date, bookings: 0, revenue: 0, cancellations: 0 };
          grouped[date].bookings++;
          if (b.status === 'Cancelled') grouped[date].cancellations++;
          else grouped[date].revenue += b.totalPrice || b.totalAmount || 0;
        });
        users.forEach(u => {
          const date = new Date(u.createdAt).toISOString().split('T')[0];
          if (!grouped[date]) grouped[date] = { date, bookings: 0, revenue: 0, cancellations: 0, newUsers: 0 };
          grouped[date].newUsers = (grouped[date].newUsers || 0) + 1;
        });
        Object.values(grouped).forEach(g => { if (!g.newUsers) g.newUsers = 0; });
        headers = ['Date', 'Bookings', 'Revenue (TK)', 'Cancellations', 'New Users'];
        rows = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
          .map(g => [g.date, g.bookings, g.revenue, g.cancellations, g.newUsers]);
        break;
      }
      case 'monthly-financial': {
        const bookings = await Booking.find({ createdAt: { $gte: start, $lte: end } }).lean();
        const refunds = await Refund.find({ createdAt: { $gte: start, $lte: end }, status: 'Completed' }).lean();
        const grouped = {};
        bookings.forEach(b => {
          const d = new Date(b.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!grouped[key]) grouped[key] = { month: key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, revenue: 0, refunds: 0, count: 0 };
          if (b.status === 'Cancelled') grouped[key].refunds += b.refundAmount || 0;
          else grouped[key].revenue += b.totalPrice || b.totalAmount || 0;
          grouped[key].count++;
        });
        refunds.forEach(r => {
          const d = new Date(r.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (grouped[key]) grouped[key].refunds += r.amountPaisa || 0;
        });
        headers = ['Month', 'Revenue (TK)', 'Refunds (TK)', 'Net Income (TK)', 'Bookings'];
        rows = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
          .map(g => [g.label, g.revenue, g.refunds, g.revenue - g.refunds, g.count]);
        break;
      }
      case 'tax-vat': {
        const bookings = await Booking.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }).lean();
        const grouped = {};
        bookings.forEach(b => {
          const d = new Date(b.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!grouped[key]) grouped[key] = { month: key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, revenue: 0 };
          grouped[key].revenue += b.totalPrice || b.totalAmount || 0;
        });
        headers = ['Month', 'Revenue (TK)', 'VAT 15% (TK)', 'Total inc. VAT (TK)'];
        rows = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
          .map(g => [g.label, g.revenue, Math.round(g.revenue * 0.15), Math.round(g.revenue * 1.15)]);
        break;
      }
      case 'customer-insights': {
        const bookings = await Booking.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }).populate('user', 'name email phoneNumber').lean();
        const customers = {};
        bookings.forEach(b => {
          if (!b.user?._id) return;
          const id = String(b.user._id);
          if (!customers[id]) customers[id] = { name: b.user.name || 'N/A', email: b.user.email || '', phone: b.user.phoneNumber || '', bookings: 0, totalSpent: 0, bikes: new Set() };
          customers[id].bookings++;
          customers[id].totalSpent += b.totalPrice || b.totalAmount || 0;
          customers[id].bikes.add(String(b.bike));
        });
        headers = ['Name', 'Email', 'Phone', 'Total Bookings', 'Total Spent (TK)', 'Avg/Booking (TK)', 'Unique Bikes'];
        rows = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent)
          .map(c => [c.name, c.email, c.phone, c.bookings, c.totalSpent, Math.round(c.totalSpent / c.bookings), c.bikes.size]);
        break;
      }
      case 'peak-hours': {
        const bookings = await Booking.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }).lean();
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i.toString().padStart(2, '0')}:00`, count: 0, revenue: 0 }));
        bookings.forEach(b => {
          const h = new Date(b.createdAt).getHours();
          hours[h].count++;
          hours[h].revenue += b.totalPrice || b.totalAmount || 0;
        });
        headers = ['Hour', 'Bookings', 'Revenue (TK)'];
        rows = hours.filter(h => h.count > 0).map(h => [h.label, h.count, h.revenue]);
        if (rows.length === 0) rows = hours.map(h => [h.label, h.count, h.revenue]);
        break;
      }
      case 'refunds': {
        const refunds = await Refund.find({ createdAt: { $gte: start, $lte: end } }).populate('userId', 'name email').populate('bookingId', 'invoiceNumber').lean();
        headers = ['Refund ID', 'Booking', 'Customer', 'Amount (TK)', 'Reason', 'Status', 'Date'];
        rows = refunds.map(r => [
          r.refundId || r._id, r.bookingId?.invoiceNumber || r.bookingId || 'N/A',
          r.userId?.name || 'N/A', r.amountPaisa || 0, r.reason || '',
          r.status || '', r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-BD') : ''
        ]);
        break;
      }
      default:
        return res.status(400).json({ message: `Unknown report type: ${type}` });
    }

    const generatedBy = req.user?.name || req.user?.id || 'Admin';
    const dateRange = { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    const subtitle = REPORT_META[type]?.description || '';

    if (format === 'pdf') {
      const pdfBuf = await generatePDF({ title, subtitle, headers, rows, dateRange, generatedBy });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuf);
    }

    if (format === 'xlsx') {
      const xlsxBuf = generateXLSX({ title, headers, rows });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      return res.send(xlsxBuf);
    }

    if (format === 'csv') {
      const csv = toCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    res.json({ type, dateRange, headers, rows, total: rows.length });
  } catch (error) {
    logger.error('generateReport error:', error.message);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};

exports.getReportTypes = async (_req, res) => {
  const types = Object.entries(REPORT_META).map(([key, val]) => ({
    key, label: val.label, description: val.description, group: REPORT_GROUPS[key] || 'other'
  }));
  res.json({ types });
};
