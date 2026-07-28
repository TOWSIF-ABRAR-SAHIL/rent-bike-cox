import { useState, useEffect, useCallback, memo } from 'react';
import api from '../api/axios';
import { DollarSign, Bike, RefreshCw } from 'lucide-react';

const RenterEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/financial/renter/earnings?days=${period}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEarnings(); }, [fetchEarnings]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  if (!data) return (
    <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
      <DollarSign size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Earnings data unavailable</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Earnings</h3>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input-dark text-xs !py-1.5" aria-label="Earnings period">
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
            <option value="365">1 Year</option>
          </select>
          <button onClick={fetchEarnings} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }} aria-label="Refresh earnings"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Earnings</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--success-text)' }}>{(data.totalEarnings || 0).toLocaleString()} TK</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed Bookings</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{data.completedBookings || 0}</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg per Booking</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--accent-text)' }}>{(data.avgPerBooking || 0).toLocaleString()} TK</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending Payout</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--warning-text)' }}>{(data.pendingPayout || 0).toLocaleString()} TK</p>
        </div>
      </div>

      {/* Per-Vehicle Breakdown */}
      {data.byVehicle && data.byVehicle.length > 0 && (
        <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bike size={16} /> Earnings by Vehicle
          </h4>
          <div className="space-y-2">
            {data.byVehicle.map(v => (
              <div key={v._id || v.model} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.model || v.brand || 'Vehicle'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.bookings || 0} bookings</p>
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--success-text)' }}>{(v.earnings || 0).toLocaleString()} TK</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RenterEarnings);
