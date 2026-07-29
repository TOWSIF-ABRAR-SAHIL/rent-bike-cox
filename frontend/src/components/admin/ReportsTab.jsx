import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import {
  Download, FileText, Loader, Calendar, Filter, X,
  BarChart3, DollarSign, Users, Bike, Tag, Wrench, CreditCard,
  TrendingUp, PieChart, MapPin, Clock, FileSpreadsheet, Shield,
  UserCheck, RefreshCw, Eye, ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  {
    key: 'financial', label: 'Financial Reports', icon: DollarSign,
    color: '#059669', bg: 'rgba(5, 150, 105, 0.08)', lightBg: '#ecfdf5',
    borderColor: 'rgba(5, 150, 105, 0.2)'
  },
  {
    key: 'operations', label: 'Operations Reports', icon: Bike,
    color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', lightBg: '#eff6ff',
    borderColor: 'rgba(37, 99, 235, 0.2)'
  },
  {
    key: 'user', label: 'User Reports', icon: Users,
    color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', lightBg: '#f5f3ff',
    borderColor: 'rgba(124, 58, 237, 0.2)'
  },
  {
    key: 'analytics', label: 'Analytics Reports', icon: BarChart3,
    color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)', lightBg: '#fff7ed',
    borderColor: 'rgba(234, 88, 12, 0.2)'
  },
];

const REPORT_TYPES = [
  { id: 'bookings', label: 'Bookings Report', icon: FileText, description: 'All bookings with status, amounts, dates', group: 'operations' },
  { id: 'revenue', label: 'Revenue Report', icon: DollarSign, description: 'Revenue breakdown by period', group: 'financial' },
  { id: 'users', label: 'Users Report', icon: Users, description: 'User registrations and activity', group: 'user' },
  { id: 'cancellations', label: 'Cancellations Report', icon: X, description: 'Cancelled bookings with reasons', group: 'operations' },
  { id: 'coupons', label: 'Coupons Report', icon: Tag, description: 'Coupon usage and discounts', group: 'user' },
  { id: 'fleet', label: 'Fleet Report', icon: Bike, description: 'Vehicle fleet utilization and status', group: 'operations' },
  { id: 'maintenance', label: 'Maintenance Report', icon: Wrench, description: 'Maintenance logs and costs', group: 'operations' },
  { id: 'payments', label: 'Payment Report', icon: CreditCard, description: 'Payment transactions and failures', group: 'financial' },
  { id: 'renter-earnings', label: 'Renter Earnings', icon: TrendingUp, description: 'Renter earnings with commission breakdown', group: 'financial' },
  { id: 'vehicle-utilization', label: 'Vehicle Utilization', icon: BarChart3, description: 'Bike usage rates and revenue per vehicle', group: 'operations' },
  { id: 'category-performance', label: 'Category Performance', icon: PieChart, description: 'Revenue and bookings by category', group: 'analytics' },
  { id: 'zone-analytics', label: 'Zone Analytics', icon: MapPin, description: 'Bookings and revenue by pickup zone', group: 'analytics' },
  { id: 'daily-summary', label: 'Daily Summary', icon: Calendar, description: 'Daily bookings, revenue and new users', group: 'analytics' },
  { id: 'monthly-financial', label: 'Monthly Financial', icon: FileSpreadsheet, description: 'Monthly revenue, refunds and net income', group: 'financial' },
  { id: 'tax-vat', label: 'Tax/VAT Report', icon: Shield, description: '15% VAT calculation on revenue', group: 'financial' },
  { id: 'customer-insights', label: 'Customer Insights', icon: UserCheck, description: 'Top customers by spending and frequency', group: 'user' },
  { id: 'peak-hours', label: 'Peak Hours', icon: Clock, description: 'Booking volume and revenue by hour', group: 'operations' },
  { id: 'refunds', label: 'Refunds Report', icon: RefreshCw, description: 'All refunds with amounts and reasons', group: 'financial' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileText, desc: 'Excel-compatible text' },
  { value: 'json', label: 'JSON', icon: FileText, desc: 'Raw structured data' },
  { value: 'pdf', label: 'PDF', icon: FileText, desc: 'Print-ready report' },
  { value: 'xlsx', label: 'XLSX', icon: FileSpreadsheet, desc: 'Excel workbook' },
];

const HistoryItem = ({ item, onDownload, onDelete, catColor }) => (
  <div className="flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:shadow-md group"
    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${catColor}15` }}>
        <FileText size={16} style={{ color: catColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.reportType}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {item.format?.toUpperCase()} &middot; {item.fileSize || '—'}
          {item.createdAt && ` · ${new Date(item.createdAt).toLocaleDateString('en-BD')}`}
        </p>
      </div>
    </div>
    <div className="flex gap-1 shrink-0">
      <button onClick={() => onDownload(item)} className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--text-muted)' }} aria-label="Download">
        <Download size= {15} />
      </button>
      <button onClick={() => onDelete(item._id)} className="p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        style={{ color: 'var(--text-muted)' }} aria-label="Delete">
        <X size={15} />
      </button>
    </div>
  </div>
);

const PreviewModal = ({ report, format, fromDate, toDate, onClose, onConfirm }) => {
  const [selectedFormat, setSelectedFormat] = useState(format);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center gradient-primary">
              <Eye size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Download Report</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{report.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Format</label>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map(f => (
                <button key={f.value} onClick={() => setSelectedFormat(f.value)}
                  className={`p-2.5 rounded-xl text-center text-xs font-medium transition-all duration-200 ${
                    selectedFormat === f.value ? 'ring-2 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={selectedFormat === f.value
                    ? { background: 'var(--accent-text)', ringColor: 'var(--accent-text)' }
                    : { background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {(fromDate || toDate) && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Date Range</label>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <Calendar size={14} />
                <span>{fromDate || 'Start'} — {toDate || 'End'}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              {report.label}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{report.description}</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border-base)' }}>
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={() => onConfirm(selectedFormat)} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            <Download size={16} />
            Download {selectedFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportsTab = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [format, setFormat] = useState('pdf');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const formatRef = useRef(null);

  const fetchTypes = useCallback(async () => {
    try {
      await api.get('/admin/reports/types');
    } catch { /* use default types */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  useEffect(() => {
    let mounted = true;
    api.get('/admin/reports/history').then(res => {
      if (mounted && res.data?.reports) setHistory(res.data.reports);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (formatRef.current && !formatRef.current.contains(e.target)) setShowFormatDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getCatConfig = (groupId) => CATEGORIES.find(c => c.key === groupId) || CATEGORIES[0];

  const downloadReport = async (type, fmt) => {
    setGenerating(type);
    try {
      const params = { type, format: fmt };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const extMap = { csv: 'csv', json: 'json', pdf: 'pdf', xlsx: 'xlsx' };
      const mimeMap = {
        csv: 'text/csv', json: 'application/json',
        pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      const responseType = fmt === 'json' ? 'json' : 'blob';
      const res = await api.post('/admin/reports/generate', params, { responseType });

      if (fmt === 'json') {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([res.data], { type: mimeMap[fmt] });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.${extMap[fmt]}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      addToast(`${type} report downloaded as ${fmt.toUpperCase()}`, 'success');
      setPreviewReport(null);
      api.get('/admin/reports/history').then(res => {
        if (res.data?.reports) setHistory(res.data.reports);
      }).catch(() => {});
    } catch {
      addToast(`Failed to generate ${type} report`, 'error');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadHistory = async (item) => {
    downloadReport(item.reportType, item.format);
  };

  const handleDeleteHistory = async (id) => {
    try {
      await api.delete(`/admin/reports/history/${id}`);
      setHistory(prev => prev.filter(h => h._id !== id));
      addToast('Report deleted', 'success');
    } catch {
      addToast('Failed to delete report', 'error');
    }
  };

  const currentFormat = FORMATS.find(f => f.value === format) || FORMATS[0];
  const groupedReports = CATEGORIES.map(cat => ({
    ...cat,
    reports: REPORT_TYPES.filter(r => r.group === cat.key)
  }));

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-5 md:p-6 border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center gradient-primary">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reports</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generate and download reports in multiple formats</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="input-dark text-sm" aria-label="From date" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="input-dark text-sm" aria-label="To date" />
          </div>
          <div className="w-36 relative" ref={formatRef}>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Format</label>
            <button onClick={() => setShowFormatDropdown(!showFormatDropdown)}
              className="input-dark text-sm flex items-center justify-between gap-2" aria-label="Select format">
              <span className="flex items-center gap-2">
                <currentFormat.icon size={14} />
                {currentFormat.label}
              </span>
              <ChevronDown size={14} className={`transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showFormatDropdown && (
              <div className="absolute top-full mt-1 left-0 w-full rounded-xl z-50 overflow-hidden shadow-lg border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
                {FORMATS.map(f => (
                  <button key={f.value} onClick={() => { setFormat(f.value); setShowFormatDropdown(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-sm transition-colors text-left ${
                      format === f.value ? 'font-semibold' : ''
                    }`}
                    style={{
                      color: format === f.value ? 'var(--accent-text)' : 'var(--text-secondary)',
                      background: format === f.value ? 'var(--accent-bg)' : 'transparent'
                    }}>
                    <f.icon size={15} />
                    <div>
                      <span className="font-medium">{f.label}</span>
                      <span className="block text-[10px] opacity-60">{f.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2">
            <button onClick={() => {
              setFromDate(''); setToDate('');
            }} className="btn-ghost text-xs !px-3 !py-3.5" aria-label="Clear filters">
              <Filter size={14} />
            </button>
            <button onClick={() => setShowHistory(!showHistory)}
              className={`btn-ghost text-xs !px-3 !py-3.5 ${showHistory ? '!border-amber-500' : ''}`}
              aria-label="Toggle history">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="rounded-2xl p-5 border animate-slide-up" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)' }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Reports</h4>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{history.length} total</span>
          </div>
          <div className="space-y-2">
            {history.map(item => {
              const report = REPORT_TYPES.find(r => r.id === item.reportType);
              const cat = getCatConfig(report?.group);
              return (
                <HistoryItem key={item._id} item={item}
                  onDownload={handleDownloadHistory}
                  onDelete={handleDeleteHistory}
                  catColor={cat.color} />
              );
            })}
          </div>
        </div>
      )}

      {groupedReports.map(cat => {
        const Icon = cat.icon;
        return (
          <div key={cat.key} className="space-y-3">
            <div className="flex items-center gap-2 px-0.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cat.bg }}>
                <Icon size={15} style={{ color: cat.color }} />
              </div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{cat.label}</h4>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${cat.borderColor}, transparent)` }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.reports.map(rt => {
                const RepIcon = rt.icon;
                return (
                  <button key={rt.id}
                    onClick={() => setPreviewReport(rt)}
                    disabled={generating === rt.id}
                    className="relative group text-left rounded-xl p-4 md:p-5 border transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-base)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 20px ${cat.color}15`;
                      e.currentTarget.style.borderColor = cat.borderColor;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'var(--border-base)';
                    }}
                    aria-label={`Generate ${rt.label}`}>
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                        style={{ background: cat.bg }}>
                        <RepIcon size={20} style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{rt.label}</p>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{rt.description}</p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {generating === rt.id ? (
                          <Loader size={18} className="animate-spin" style={{ color: cat.color }} />
                        ) : (
                          <Download size={16} style={{ color: cat.color, opacity: 0.6 }} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {groupedReports.every(c => c.reports.length === 0) && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p className="font-medium">No reports available</p>
        </div>
      )}

      {previewReport && (
        <PreviewModal
          report={previewReport}
          format={format}
          fromDate={fromDate}
          toDate={toDate}
          onClose={() => setPreviewReport(null)}
          onConfirm={(fmt) => downloadReport(previewReport.id, fmt)}
        />
      )}
    </div>
  );
};

export default ReportsTab;
