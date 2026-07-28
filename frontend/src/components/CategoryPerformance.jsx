import { PieChart } from 'lucide-react';

const CategoryPerformance = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <PieChart size={16} /> Category Performance
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>
      ) : (
        <div className="space-y-3">
          {data.map((cat, i) => {
            const share = totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : 0;
            const avgPerBooking = cat.bookings > 0 ? Math.round(cat.revenue / cat.bookings) : 0;
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cat.category}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cat.bikes} bikes · {cat.bookings} bookings · {share}%</span>
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
                <div className="flex justify-between mt-0.5">
                  <p className="text-xs" style={{ color: 'var(--accent-text)' }}>{cat.revenue.toLocaleString()} TK</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>avg {avgPerBooking.toLocaleString()} TK/booking</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryPerformance;
