const BookingTrendChart = ({ data }) => {
  const { statusBreakdown, bookingsByDay } = data;
  const maxTotal = Math.max(...bookingsByDay.map(d => d.total), 1);

  const statusColors = {
    Confirmed: 'var(--success-text)',
    Completed: 'var(--info-text)',
    Cancelled: 'var(--danger-text)',
    Pending: 'var(--warning-text)',
    Active: 'var(--accent-text)',
    Expired: 'var(--text-muted)',
  };

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Booking Trends</h3>

      <div className="flex flex-wrap gap-3 mb-4">
        {statusBreakdown.map(s => (
          <div key={s.status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: statusColors[s.status] || 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.status}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.count}</span>
          </div>
        ))}
      </div>

      {bookingsByDay.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No booking data</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {bookingsByDay.slice(-30).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}>
                {d.date}: {d.total} total, {d.completed} completed, {d.cancelled} cancelled
              </div>
              <div className="w-full flex flex-col gap-px rounded-t overflow-hidden" style={{ height: `${(d.total / maxTotal) * 100}%` }}>
                {d.completed > 0 && <div className="w-full" style={{ flex: d.completed, background: 'var(--info-text)' }} />}
                {d.cancelled > 0 && <div className="w-full" style={{ flex: d.cancelled, background: 'var(--danger-text)' }} />}
                {d.total - d.completed - d.cancelled > 0 && (
                  <div className="w-full" style={{ flex: d.total - d.completed - d.cancelled, background: 'var(--accent-text)', opacity: 0.5 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingTrendChart;
