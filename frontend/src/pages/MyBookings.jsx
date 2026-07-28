import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Clock, MapPin, Loader2, AlertTriangle, Plus, Download, Trash2, RotateCcw, Search, X } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const STATUS_STYLES = {
  Pending: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  Confirmed: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  Completed: { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'var(--info-border)' },
  Cancelled: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
  Expired: { bg: 'var(--hover-bg)', color: 'var(--text-muted)', border: 'var(--border-base)' },
};

const STATUSES = ['', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Expired'];
const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest', label: 'Highest Price' },
  { value: 'lowest', label: 'Lowest Price' },
];

const CANCEL_REASONS = [
  'Changed my mind',
  'Found cheaper option',
  'Schedule conflict',
  'Emergency',
  'Weather concerns',
  'Vehicle not suitable',
  'Other',
];

const MyBookings = () => {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [extendingId, setExtendingId] = useState(null);
  const [newEndTime, setNewEndTime] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');

  const fetchBookings = useCallback(() => {
    setLoading(true);
    setFetchError('');
    const params = new URLSearchParams({ page, limit: '10', sort: sortBy });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    api.get(`/booking/my-bookings?${params}`)
      .then(res => {
        if (res.data.bookings) {
          setBookings(res.data.bookings);
          setTotalPages(res.data.pages);
        } else {
          setBookings(res.data);
          setTotalPages(1);
        }
      })
      .catch(() => { addToast('Failed to load bookings', 'error'); setFetchError('Failed to load bookings.'); })
      .finally(() => setLoading(false));
  }, [addToast, page, statusFilter, sortBy, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleExtend = useCallback(async (bookingId) => {
    if (!newEndTime) { addToast('Please select a new end time', 'error'); return; }
    setExtendingId(bookingId);
    try {
      const res = await api.post(`/booking/${bookingId}/extend`, { newEndTime: new Date(newEndTime).toISOString() });
      setBookings(prev => prev.map(b => b._id === bookingId ? res.data.booking : b));
      addToast(`Extended! +${res.data.additionalHours}h — ${res.data.additionalPrice} TK`, 'success');
      setNewEndTime('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Extension failed', 'error');
    } finally {
      setExtendingId(null);
    }
  }, [newEndTime, addToast]);

  const handleCancel = useCallback(async (bookingId) => {
    try {
      const res = await api.put(`/booking/${bookingId}/cancel`, { reason: cancelReason });
      setBookings(prev => prev.map(b => b._id === bookingId ? res.data.booking : b));
      addToast(`Cancelled. Refund: ${res.data.refund.refundableAmount} TK (${res.data.refund.reason})`, 'success');
      setCancelModal(null);
      setCancelReason('Changed my mind');
    } catch (err) {
      addToast(err.response?.data?.message || 'Cancellation failed', 'error');
    }
  }, [cancelReason, addToast]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/auth/export-data');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentbikecox-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* export failed */ } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!window.confirm('This will permanently delete all your data. Are you absolutely sure?')) return;
    setDeleting(true);
    try {
      await api.delete('/auth/delete-account');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    } catch (err) {
      alert(err.response?.data?.message || 'Account deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <SkeletonPage />;

  if (fetchError) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center glass rounded-2xl p-8 max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => fetchBookings()} className="btn-primary">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>My Bookings</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-ghost text-sm flex items-center gap-1" aria-label="Export data">
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export Data'}
          </button>
          <button onClick={handleDeleteAccount} disabled={deleting} className="text-sm flex items-center gap-1 px-3 py-2 rounded-lg" style={{ color: 'var(--danger-text)' }} aria-label="Delete account">
            <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by bike model..." className="input-dark text-sm w-full pl-9"
            aria-label="Search bookings" />
          {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-dark text-sm flex-shrink-0" aria-label="Filter by status">
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
          className="input-dark text-sm flex-shrink-0" aria-label="Sort by">
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {bookings.length === 0 ? (
        <EmptyState icon={Clock} title="No bookings found" description={search || statusFilter ? 'Try different search or filter' : "You haven't made any bookings yet."}
          action={!search && !statusFilter ? <Link to="/" className="btn-primary inline-flex items-center mt-2"><Plus size={16} className="mr-1" /> Browse Bikes</Link> : undefined} />
      ) : (
        <>
          <div className="space-y-4">
            {bookings.map(booking => {
              const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.Pending;
              const canExtend = booking.status === 'Confirmed' && new Date(booking.endTime) > new Date();
              const canCancel = ['Pending', 'Confirmed'].includes(booking.status);

              return (
                <div key={booking._id} className="glass rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {booking.bike?.images?.[0] && (
                        <img src={booking.bike.images[0]} alt={booking.bike?.model} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" onError={(e) => { e.target.src = 'https://placehold.co/100x100/1a1a2e/666?text=N/A'; }} />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{booking.bike?.model || 'Unknown Bike'}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{booking.bike?.brand} — {booking.packageName || 'Hourly'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold border self-start" style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Start</p>
                      <p style={{ color: 'var(--text-primary)' }}>{new Date(booking.startTime).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>End</p>
                      <p style={{ color: 'var(--text-primary)' }}>{new Date(booking.endTime).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Total</p>
                      <p className="font-bold" style={{ color: 'var(--accent-text)' }}>{booking.totalPrice} TK</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Invoice</p>
                      <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{booking.invoiceNumber || '—'}</p>
                    </div>
                  </div>

                  {booking.destination && (
                    <div className="flex items-center text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={14} className="mr-1" /> {booking.destination}
                    </div>
                  )}

                  {canExtend && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Extend booking:</span>
                      <input type="datetime-local" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="input-dark text-sm !py-1.5 !px-3 flex-1 max-w-xs" aria-label="Extension end time" />
                      <button onClick={() => handleExtend(booking._id)} disabled={extendingId === booking._id || !newEndTime}
                        className="flex items-center px-3 py-2 min-h-10 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }} aria-label="Extend booking">
                        {extendingId === booking._id ? <Loader2 size={14} className="animate-spin" /> : <><Clock size={14} className="mr-1" /> Extend</>}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t flex-wrap" style={{ borderColor: 'var(--border-base)' }}>
                    {canCancel && (
                      <button onClick={() => setCancelModal(booking._id)}
                        className="flex items-center px-3 py-2 min-h-10 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }} aria-label="Cancel booking">
                        <AlertTriangle size={14} className="mr-1" /> Cancel Booking
                      </button>
                    )}
                    {booking.status === 'Completed' && booking.bike?._id && (
                      <Link to={`/bike/${booking.bike._id}`}
                        className="flex items-center gap-1.5 px-4 py-2.5 min-h-10 rounded-xl text-xs font-medium transition-all"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}>
                        <RotateCcw size={14} /> Rebook
                      </Link>
                    )}
                    {booking.status === 'Pending' && (
                      <Link to={`/checkout/${booking.bike?._id}`} className="btn-primary text-xs inline-flex items-center">
                        Complete Payment
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
        </>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Cancel Booking</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Please select a reason for cancellation. Refund will be calculated based on our cancellation policy.</p>
            <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              className="input-dark text-sm w-full mb-4" aria-label="Cancellation reason">
              {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Refund policy: 100% if cancelled 24h+ before start, 50% if 12-24h before, 0% if less than 12h.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setCancelModal(null); setCancelReason('Changed my mind'); }}
                className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }} aria-label="Keep booking">Keep Booking</button>
              <button onClick={() => handleCancel(cancelModal)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--danger-text, #ef4444)' }} aria-label="Confirm cancellation">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
