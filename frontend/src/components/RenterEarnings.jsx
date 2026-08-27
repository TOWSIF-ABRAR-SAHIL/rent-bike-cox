import { useState, useEffect, useCallback, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import { DollarSign, Bike, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

const formatRevenueLabel = (date) => {
  if (!date) return '';
  if (date.length === 7) return date;
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
};

const PAYOUT_STYLES = {
  Paid: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  Partial: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  Unpaid: { bg: 'var(--info-bg, rgba(59,130,246,0.1))', text: 'var(--info-text, #3b82f6)' },
  Refunded: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

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

  const chartData = (data.revenueSeries || []).map(p => ({ date: p.date, revenue: p.revenue }));
  const transactions = data.recentTransactions || [];
  const totalRevenue = data.totalEarnings || 0;
  const pendingPayout = data.pendingPayout || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Earnings Overview</h3>
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
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: 'var(--success-text)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
          </div>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--success-text)' }}>{totalRevenue.toLocaleString()} TK</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} style={{ color: 'var(--accent-text)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This Month</p>
          </div>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--accent-text)' }}>
            {totalRevenue.toLocaleString()} TK
          </p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed Bookings</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{data.completedBookings || 0}</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending Payout</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--warning-text)' }}>{pendingPayout.toLocaleString()} TK</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 /> Revenue Over Time
        </h4>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Earnings broken down by {period > 90 ? 'month' : 'day'}</p>
        <div style={{ width: '100%', height: 280 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatRevenueLabel}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()} TK`, 'Revenue']}
                  labelFormatter={formatRevenueLabel}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)', borderRadius: 12, color: 'var(--text-primary)' }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No revenue data for this period
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Bike size={16} /> Recent Transactions
        </h4>
        {transactions.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No completed transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-base)' }}>
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Booking ID</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Vehicle</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Renter</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Duration</th>
                  <th className="text-right py-3 px-2 font-semibold text-xs uppercase tracking-wide">Total Amount</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.bookingId || i} style={{ borderBottom: '1px solid var(--border-base)' }}>
                    <td className="py-3 px-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>#{typeof t.bookingId === 'string' ? t.bookingId.slice(-8) : t.bookingId}</td>
                    <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{t.vehicle}</td>
                    <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{t.renterName}</td>
                    <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{t.duration}h</td>
                    <td className="py-3 px-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{t.totalAmount.toLocaleString()} TK</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: (PAYOUT_STYLES[t.payoutStatus] || PAYOUT_STYLES.Paid).bg,
                          color: (PAYOUT_STYLES[t.payoutStatus] || PAYOUT_STYLES.Paid).text,
                        }}>
                        {t.payoutStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const BarChart3 = () => <TrendingUp size={16} />;

export default memo(RenterEarnings);
