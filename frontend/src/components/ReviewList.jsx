import { Star, MessageSquare } from 'lucide-react';

const ReviewList = ({ stats, reviews, page, pages, onPageChange, sort, onSortChange }) => {
  const ratingBars = [
    { stars: 5, count: stats.five || 0 },
    { stars: 4, count: stats.four || 0 },
    { stars: 3, count: stats.three || 0 },
    { stars: 2, count: stats.two || 0 },
    { stars: 1, count: stats.one || 0 },
  ];

  return (
    <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
      {/* Rating summary */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border-base)' }}>
        <div className="text-center md:text-left md:flex-shrink-0">
          <p className="text-4xl font-bold" style={{ color: 'var(--accent-text)' }}>{stats.avgRating?.toFixed(1) || '0.0'}</p>
          <div className="flex items-center justify-center md:justify-start gap-0.5 my-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={16} fill={s <= Math.round(stats.avgRating || 0) ? 'var(--accent-text)' : 'none'} style={{ color: 'var(--accent-text)' }} />
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stats.total || 0} reviews</p>
        </div>

        <div className="flex-1 w-full space-y-1.5">
          {ratingBars.map(bar => (
            <div key={bar.stars} className="flex items-center gap-2">
              <span className="text-xs w-3" style={{ color: 'var(--text-muted)' }}>{bar.stars}</span>
              <Star size={10} fill="var(--accent-text)" style={{ color: 'var(--accent-text)' }} />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                <div className="h-full rounded-full" style={{ width: `${stats.total > 0 ? (bar.count / stats.total) * 100 : 0}%`, background: 'var(--accent-text)' }} />
              </div>
              <span className="text-xs w-4 text-right" style={{ color: 'var(--text-muted)' }}>{bar.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Reviews</h3>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="px-2 py-1 rounded-lg text-xs outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          aria-label="Sort reviews"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {reviews.length === 0 ? (
        <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          <MessageSquare size={32} className="mx-auto mb-2" />
          <p className="text-sm">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review._id} className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {review.user?.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{review.user?.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={10} fill={s <= review.rating ? 'var(--accent-text)' : 'none'} style={{ color: 'var(--accent-text)' }} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.title && <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{review.title}</p>}
              {review.comment && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{review.comment}</p>}
              {review.response && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--accent-text)' }}>
                    Response from {review.respondedBy?.name || 'Owner'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{review.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-7 h-7 rounded-lg text-xs font-medium"
              style={{
                background: p === page ? 'var(--accent-bg)' : 'transparent',
                color: p === page ? 'var(--accent-text)' : 'var(--text-muted)',
                border: `1px solid ${p === page ? 'var(--accent-border)' : 'var(--border-base)'}`,
              }}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewList;
