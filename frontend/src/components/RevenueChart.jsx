import { TrendingUp } from 'lucide-react';

const RevenueChart = ({ data }) => {
  const { revenueByDay, totalRevenue, avgRevenuePerDay } = data;
  const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue), 1);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TrendingUp size={16} /> Revenue Over Time
        </h3>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
          Total: {totalRevenue.toLocaleString()} TK
        </span>
      </div>
      {revenueByDay.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No revenue data</p>
      ) : (
        <>
          <div className="relative mb-2">
            <div className="absolute left-0 right-0 border-dashed" style={{ bottom: `${(avgRevenuePerDay / maxRevenue) * 100}%`, borderTop: '1px dashed var(--text-muted)', opacity: 0.3 }} />
          </div>
          <div className="flex items-end gap-1 h-40">
            {revenueByDay.slice(-30).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}>
                  {d.date}: {d.revenue.toLocaleString()} TK ({d.count} bookings)
                </div>
                <div
                  className="w-full rounded-t transition-all min-h-[2px] hover:opacity-100"
                  style={{
                    height: `${(d.revenue / maxRevenue) * 100}%`,
                    background: 'var(--accent-text)',
                    opacity: 0.75,
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueChart;
