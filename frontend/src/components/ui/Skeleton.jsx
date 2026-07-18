export const SkeletonCard = ({ className = '' }) => (
  <div className={`glass rounded-2xl overflow-hidden ${className}`}>
    <div className="skeleton h-52 w-full" />
    <div className="p-5 space-y-3">
      <div className="skeleton h-5 rounded-lg w-2/3" />
      <div className="skeleton h-4 rounded-lg w-1/2" />
      <div className="skeleton h-4 rounded-lg w-1/3" />
    </div>
  </div>
);

const widths = [85, 72, 91, 78, 67];

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2.5 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton h-4 rounded-lg" style={{ width: `${widths[i % widths.length]}%` }} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="skeleton h-10 rounded-lg flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonPage = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <div className="skeleton h-8 rounded-lg w-48" />
    <div className="skeleton h-4 rounded-lg w-full max-w-96" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  </div>
);
