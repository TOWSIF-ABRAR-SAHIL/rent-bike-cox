import { BarChart3 } from 'lucide-react';

const HourlyDistribution = ({ data }) => {
  const { hourlyDistribution } = data;
  const maxCount = Math.max(...hourlyDistribution.map(h => h.count), 1);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyDistribution.find(h => h.hour === i);
    return { hour: i, count: found?.count || 0 };
  });

  const peakHour = hours.reduce((max, h) => h.count > max.count ? h : max, hours[0]);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <BarChart3 size={16} /> Booking Hours Distribution
      </h3>

      {peakHour.count > 0 && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Peak hour: <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{peakHour.hour}:00</span> ({peakHour.count} bookings)
        </p>
      )}

      {hourlyDistribution.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>
      ) : (
        <div className="flex items-end gap-px h-28">
          {hours.map((h) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}>
                {h.hour}:00 — {h.count} bookings
              </div>
              <div
                className="w-full rounded-t transition-all min-h-[1px]"
                style={{
                  height: `${(h.count / maxCount) * 100}%`,
                  background: h.hour === peakHour.hour ? 'var(--accent-text)' : 'var(--info-text)',
                  opacity: h.count === 0 ? 0.1 : 0.8,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>0:00</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>6:00</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>12:00</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>18:00</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>23:00</span>
      </div>
    </div>
  );
};

export default HourlyDistribution;
