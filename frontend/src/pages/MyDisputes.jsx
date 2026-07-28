import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { AlertTriangle, Loader2, ChevronDown, ChevronUp, MessageSquare, CheckCircle } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const STATUS_STYLES = {
  'Open': { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
  'Under Review': { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  'Resolved': { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  'Rejected': { bg: 'var(--hover-bg)', color: 'var(--text-muted)', border: 'var(--border-base)' },
};

const REASON_LABELS = {
  refund: 'Refund Issue',
  damage: 'Vehicle Damage',
  overcharge: 'Overcharged',
  no_show: 'No Show',
  wrong_vehicle: 'Wrong Vehicle',
  late_return: 'Late Return',
  maintenance: 'Poor Maintenance',
  other: 'Other',
};

const MyDisputes = () => {
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ bookingId: '', reason: 'other', description: '' });

  const fetchDisputes = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: '10' });
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/disputes/my?${params}`)
      .then(({ data }) => {
        setDisputes(data.disputes);
        setTotalPages(data.pages);
      })
      .catch(() => addToast('Failed to load disputes', 'error'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bookingId || !form.reason || !form.description) {
      addToast('All fields are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/disputes', form);
      addToast('Dispute raised successfully', 'success');
      setShowForm(false);
      setForm({ bookingId: '', reason: 'other', description: '' });
      fetchDisputes();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create dispute', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} style={{ color: 'var(--warning-text)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Disputes</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Raise and track disputes for your bookings</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1" aria-label="Toggle new dispute form">
          <MessageSquare size={14} /> {showForm ? 'Cancel' : 'New Dispute'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 mb-6 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Raise a New Dispute</h3>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Booking ID</label>
            <input type="text" value={form.bookingId} onChange={e => setForm(f => ({ ...f, bookingId: e.target.value }))}
              placeholder="Enter booking ID from your booking history"
              className="input-dark text-sm w-full" required aria-label="Booking ID" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Reason</label>
            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="input-dark text-sm w-full" aria-label="Dispute reason">
              {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4} className="input-dark text-sm w-full resize-none" maxLength={2000} required aria-label="Description" />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{form.description.length}/2000</p>
          </div>
          <button type="submit" disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50" aria-label="Submit dispute">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <>Submit Dispute</>}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'Open', 'Under Review', 'Resolved', 'Rejected'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === s ? 'gradient-primary text-white' : ''}`}
            style={statusFilter !== s ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' } : { borderColor: 'transparent' }}
            aria-label={`Filter by ${s || 'All'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No disputes" description="You haven't raised any disputes yet." />
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const st = STATUS_STYLES[d.status] || STATUS_STYLES.Open;
            const isExpanded = expanded === d._id;
            return (
              <div key={d._id} className="glass rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-base)' }}>
                <button onClick={() => setExpanded(isExpanded ? null : d._id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  aria-label="Toggle dispute details">
                  <div className="flex items-center gap-3 min-w-0">
                    {d.bike?.images?.[0] && (
                      <img src={d.bike.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {REASON_LABELS[d.reason] || d.reason}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {d.bike?.model || 'Unknown'} — {new Date(d.createdAt).toLocaleDateString('en-BD')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded text-xs font-medium border" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                      {d.status}
                    </span>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: '1px solid var(--border-base)' }}>
                    <div className="pt-3">
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>Booking: {d.booking?._id?.slice(-8) || 'N/A'}</span>
                      <span>Raised: {new Date(d.createdAt).toLocaleString('en-BD')}</span>
                    </div>
                    {d.resolution && (
                      <div className="p-3 rounded-xl" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
                        <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--success-text)' }}>
                          <CheckCircle size={12} /> Resolution
                        </p>
                        <p className="text-sm" style={{ color: 'var(--success-text)' }}>{d.resolution}</p>
                        {d.resolvedBy && (
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Resolved by {d.resolvedBy.name || 'Admin'} on {new Date(d.resolvedAt).toLocaleDateString('en-BD')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i + 1 ? 'gradient-primary text-white' : ''}`}
              style={page !== i + 1 ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-base)' } : {}}
              aria-label={`Page ${i + 1}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDisputes;
