import { MapPin, Tag } from 'lucide-react';

const SearchAutocomplete = ({ suggestions, onSelect }) => {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl overflow-hidden z-[100] animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="py-2">
        {suggestions.map((s, idx) => (
          <button
            key={`${s.type}-${s.id || s.slug}-${idx}`}
            onClick={() => onSelect(s)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all"
            style={{ color: 'var(--text-primary)' }}
            aria-label={`Select ${s.label}`}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {s.type === 'vehicle' && s.image ? (
              <img src={s.image} alt="" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                {s.type === 'category' ? <Tag size={14} style={{ color: 'var(--accent-text)' }} /> : <MapPin size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.sublabel}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md capitalize" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
              {s.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchAutocomplete;
