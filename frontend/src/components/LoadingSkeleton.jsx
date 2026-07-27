const LoadingSkeleton = ({ rows = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--border-base)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded w-1/3" style={{ background: 'var(--border-base)' }} />
              <div className="h-2 rounded w-1/4" style={{ background: 'var(--border-base)' }} />
            </div>
            <div className="h-6 w-16 rounded-md" style={{ background: 'var(--border-base)' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
