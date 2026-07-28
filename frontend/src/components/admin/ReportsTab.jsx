import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Download, FileText } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'bookings', label: 'Bookings Report', icon: '📋', description: 'All bookings with status, amounts, dates' },
  { id: 'revenue', label: 'Revenue Report', icon: '💰', description: 'Revenue breakdown by period' },
  { id: 'users', label: 'Users Report', icon: '👥', description: 'User registrations and activity' },
  { id: 'cancellations', label: 'Cancellations Report', icon: '❌', description: 'Cancelled bookings with reasons' },
  { id: 'coupons', label: 'Coupons Report', icon: '🏷️', description: 'Coupon usage and discounts' },
];

const ReportsTab = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [format, setFormat] = useState('json');

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      await api.get('/admin/reports/types');
    } catch { /* use default types */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTypes(); }, [fetchTypes]);

  const generateReport = async (type) => {
    setGenerating(type);
    try {
      const params = { type, format };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await api.post('/admin/reports/generate', params, { responseType: format === 'csv' ? 'blob' : 'json' });

      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        addToast(`${type} report downloaded`, 'success');
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        addToast(`${type} report downloaded`, 'success');
      }
    } catch {
      addToast(`Failed to generate ${type} report`, 'error');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reports</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Generate and download reports in CSV or JSON format.</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-dark text-sm" aria-label="Report start date" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-dark text-sm" aria-label="Report end date" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="input-dark text-sm" aria-label="Report format">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={() => generateReport(rt.id)} disabled={generating === rt.id}
            className="glass rounded-xl p-5 border text-left transition-all hover:opacity-90 disabled:opacity-50"
            style={{ borderColor: 'var(--border-base)' }}
            aria-label={`Generate ${rt.label}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg mb-1">{rt.icon}</p>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{rt.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{rt.description}</p>
              </div>
              <Download size={18} style={{ color: 'var(--accent-text)', opacity: generating === rt.id ? 0.3 : 1 }} className={generating === rt.id ? 'animate-spin' : ''} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReportsTab;
