import { Clock } from 'lucide-react';

const RentalDurationChart = ({ data }) => {
  const { buckets, avgHours, medianHours, totalBookings } = data;
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  const bucketColors = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Clock size={16} /> Rental Duration Distribution
      </h3>

      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{avgHours}h</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Median</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{medianHours}h</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{totalBookings}</span>
        </div>
      </div>

      {totalBookings === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No completed rentals</p>
      ) : (
        <div className="space-y-2">
          {buckets.map((bucket, i) => (
            <div key={bucket.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{bucket.label}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bucket.count} ({bucket.percentage}%)</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(bucket.count / maxCount) * 100}%`, background: bucketColors[i] }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RentalDurationChart;
