const FleetUtilizationChart = ({ data }) => {
  const { fleetUtilization, bikes, days } = data;
  const topBikes = bikes.slice(0, 8);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Utilization (Last {days} Days)</h3>
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
          Fleet: {fleetUtilization}%
        </span>
      </div>
      {topBikes.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No utilization data</p>
      ) : (
        <div className="space-y-3">
          {topBikes.map(bike => {
            const pct = Math.min(100, parseFloat(bike.utilization));
            return (
              <div key={bike.bikeId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate max-w-[60%]" style={{ color: 'var(--text-secondary)' }}>{bike.brand} {bike.model}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{bike.utilization}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct > 70 ? 'var(--success-text)' : pct > 30 ? 'var(--accent-text)' : 'var(--warning-text)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FleetUtilizationChart;
