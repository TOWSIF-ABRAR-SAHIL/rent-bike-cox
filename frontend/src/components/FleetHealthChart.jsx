const FleetHealthChart = ({ conditionMap }) => {
  const conditions = [
    { key: 'excellent', label: 'Excellent', color: '#22c55e' },
    { key: 'good', label: 'Good', color: '#3b82f6' },
    { key: 'fair', label: 'Fair', color: '#f59e0b' },
    { key: 'poor', label: 'Poor', color: '#ef4444' },
  ];

  const total = Object.values(conditionMap).reduce((a, b) => a + b, 0);

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Vehicle Condition</h3>
      {total === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No vehicles yet</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--border-base)' }}>
              {conditions.map(c => {
                const pct = total > 0 ? (conditionMap[c.key] / total) * 100 : 0;
                return pct > 0 ? (
                  <div key={c.key} className="h-full transition-all" style={{ width: `${pct}%`, background: c.color }} title={`${c.label}: ${conditionMap[c.key]}`} />
                ) : null;
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {conditions.map(c => (
              <div key={c.key} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                <span className="text-xs font-medium ml-auto" style={{ color: 'var(--text-primary)' }}>{conditionMap[c.key]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FleetHealthChart;
