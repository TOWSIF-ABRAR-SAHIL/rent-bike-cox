import { useState } from 'react';
import { Star } from 'lucide-react';

const ReviewForm = ({ onSubmit, loading }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setError('');
    try {
      await onSubmit({ rating, title, comment });
      setRating(0);
      setTitle('');
      setComment('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Write a Review</h3>

      {error && (
        <div className="mb-3 p-2 rounded-lg text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                size={24}
                fill={(hoverRating || rating) >= star ? 'var(--accent-text)' : 'none'}
                style={{ color: 'var(--accent-text)' }}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs ml-2 self-center" style={{ color: 'var(--text-muted)' }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          aria-label="Review title"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Review</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell others about your experience..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          aria-label="Review comment"
        />
        <p className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{comment.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
        style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
        aria-label="Submit review"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};

export default ReviewForm;
