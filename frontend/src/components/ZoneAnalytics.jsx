import { MapPin } from 'lucide-react';

const ZoneAnalytics = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <MapPin size={16} /> Revenue by Zone
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No zone data</p>
      ) : (
        <div className="space-y-3">
          {data.map((zone) => (
            <div key={zone.slug}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: zone.color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{zone.zone}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{zone.bookings} bookings · {zone.vehicleCount} vehicles</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(zone.revenue / maxRevenue) * 100}%`, background: zone.color }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <p className="text-xs" style={{ color: 'var(--accent-text)' }}>{zone.revenue.toLocaleString()} TK</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>avg {zone.avgRevenue.toLocaleString()} TK</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZoneAnalytics;
