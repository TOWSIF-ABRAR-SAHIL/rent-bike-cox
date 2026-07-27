const RevenueChart = ({ data }) => {
  const { revenueByDay } = data;
  const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue), 1);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Revenue Over Time</h3>
      {revenueByDay.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No revenue data</p>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {revenueByDay.slice(-30).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}>
                {d.date}: {d.revenue.toLocaleString()} TK ({d.count} bookings)
              </div>
              <div
                className="w-full rounded-t transition-all min-h-[2px]"
                style={{
                  height: `${(d.revenue / maxRevenue) * 100}%`,
                  background: 'var(--accent-text)',
                  opacity: 0.8,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
