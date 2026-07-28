import { memo } from 'react';
import { Link } from 'react-router-dom';
import { X, GitCompareArrows, Trash2 } from 'lucide-react';
import { useCompare } from '../context/useCompare';

const CompareBar = () => {
  const { items, remove, clear } = useCompare();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-slide-up md:bottom-0 bottom-14" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-base)', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <GitCompareArrows size={18} style={{ color: 'var(--accent-text)' }} className="flex-shrink-0" />
            {items.map(bike => (
              <div key={bike._id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
                <img src={bike.images?.[0] || 'https://placehold.co/40x40/1a1a2e/666?text=No'} alt={bike.model} className="w-8 h-8 rounded object-cover" />
                <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>{bike.model}</span>
                <button onClick={() => remove(bike._id)} className="p-0.5 rounded hover:bg-red-500/20" style={{ color: 'var(--danger-text)' }} aria-label={`Remove ${bike.model} from comparison`}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {items.length < 3 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Add {3 - items.length} more</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={clear} className="p-2 rounded-lg transition-all hover:bg-red-500/10" style={{ color: 'var(--danger-text)' }} aria-label="Clear comparison">
              <Trash2 size={16} />
            </button>
            <Link
              to="/compare"
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
              style={{ background: 'var(--accent-text)', color: 'white' }}
            >
              Compare ({items.length})
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CompareBar);
