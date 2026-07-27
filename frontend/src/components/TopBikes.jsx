const TopBikes = ({ data }) => {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Top Performing Vehicles</h3>
      {data.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--border-base)' }}>
                {item.bike?.images?.[0] ? (
                  <img src={item.bike.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>N/A</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.bike?.brand} {item.bike?.model}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.bookings} bookings · {item.bike?.category?.name || 'N/A'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{item.revenue.toLocaleString()} TK</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>avg {item.avgRevenue.toLocaleString()} TK</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopBikes;
