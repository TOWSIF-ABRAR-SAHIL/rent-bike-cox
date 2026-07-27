const CategoryPerformance = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Category Performance</h3>
      {data.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>
      ) : (
        <div className="space-y-3">
          {data.map((cat, i) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cat.category}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cat.bikes} bikes · {cat.bookings} bookings</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(cat.revenue / maxRevenue) * 100}%`,
                    background: `hsl(${i * 60 + 30}, 70%, 50%)`,
                  }}
                />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>{cat.revenue.toLocaleString()} TK</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryPerformance;
