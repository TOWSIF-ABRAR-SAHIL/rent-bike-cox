import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Clock, MapPin, Loader2, AlertTriangle, Plus } from 'lucide-react';
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

const MyBookings = () => {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [extendingId, setExtendingId] = useState(null);
  const [newEndTime, setNewEndTime] = useState('');

  useEffect(() => {
    api.get('/booking/my-bookings')
      .then(res => setBookings(res.data))
      .catch(() => { addToast('Failed to load bookings', 'error'); setFetchError('Failed to load bookings.'); })
      .finally(() => setLoading(false));
  }, [addToast]);

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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await api.put(`/booking/${bookingId}/cancel`, { reason: 'Cancelled by user' });
      setBookings(prev => prev.map(b => b._id === bookingId ? res.data.booking : b));
      addToast(`Cancelled. Refund: ${res.data.refund.refundableAmount} TK (${res.data.refund.reason})`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Cancellation failed', 'error');
    }
  }, [addToast]);

  if (loading) return <SkeletonPage />;

  if (fetchError) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center glass rounded-2xl p-8 max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>My Bookings</h1>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No bookings yet"
          description="You haven't made any bookings. Browse available bikes to get started."
          action={<Link to="/" className="btn-primary inline-flex items-center mt-2"><Plus size={16} className="mr-1" /> Browse Bikes</Link>}
        />
      ) : (
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
                    <input type="datetime-local" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="input-dark text-sm !py-1.5 !px-3 flex-1 max-w-xs" />
                    <button onClick={() => handleExtend(booking._id)} disabled={extendingId === booking._id || !newEndTime}
                      className="flex items-center px-3 py-2 min-h-10 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}>
                      {extendingId === booking._id ? <Loader2 size={14} className="animate-spin" /> : <><Clock size={14} className="mr-1" /> Extend</>}
                    </button>
                  </div>
                )}

                {canCancel && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
                    <button onClick={() => handleCancel(booking._id)}
                      className="flex items-center px-3 py-2 min-h-10 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
                      <AlertTriangle size={14} className="mr-1" /> Cancel Booking
                    </button>
                  </div>
                )}

                {booking.status === 'Pending' && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
                    <Link to={`/checkout/${booking.bike?._id}`} className="btn-primary text-xs inline-flex items-center">
                      Complete Payment
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
