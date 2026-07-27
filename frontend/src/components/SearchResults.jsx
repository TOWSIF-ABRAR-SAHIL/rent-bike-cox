import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, LayoutGrid, List } from 'lucide-react';

const conditionColors = {
  excellent: { text: 'var(--success-text)', bg: 'var(--success-bg)' },
  good: { text: 'var(--info-text)', bg: 'var(--info-bg)' },
  fair: { text: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  poor: { text: 'var(--danger-text)', bg: 'var(--danger-bg)' },
};

const SearchResults = ({ bikes }) => {
  const [viewMode, setViewMode] = useState('grid');

  if (viewMode === 'list') {
    return (
      <div>
        <div className="flex justify-end mb-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--input-bg)' }}>
            <button onClick={() => setViewMode('grid')} className="p-1.5 rounded-md" style={{ color: viewMode === 'grid' ? 'var(--accent-text)' : 'var(--text-muted)' }} aria-label="Grid view">
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className="p-1.5 rounded-md" style={{ color: viewMode === 'list' ? 'var(--accent-text)' : 'var(--text-muted)', background: 'var(--bg-card)' }} aria-label="List view">
              <List size={16} />
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {bikes.map(bike => (
            <Link key={bike._id} to={`/bike/${bike._id}`} className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }} aria-label={`View ${bike.brand} ${bike.model} details`}>
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--border-base)' }}>
                {bike.images?.[0] ? (
                  <img src={bike.images[0]} alt={bike.model} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>N/A</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.category?.name}</span>
                  {bike.zone && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={10} /> {bike.zone.name}
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: conditionColors[bike.condition]?.bg, color: conditionColors[bike.condition]?.text }}>
                    {bike.condition}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{bike.pricePerHour} TK/hr</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.renter?.name || 'N/A'}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--input-bg)' }}>
          <button onClick={() => setViewMode('grid')} className="p-1.5 rounded-md" style={{ color: viewMode === 'grid' ? 'var(--accent-text)' : 'var(--text-muted)', background: 'var(--bg-card)' }} aria-label="Grid view">
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className="p-1.5 rounded-md" style={{ color: viewMode === 'list' ? 'var(--accent-text)' : 'var(--text-muted)' }} aria-label="List view">
            <List size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {bikes.map(bike => (
          <Link key={bike._id} to={`/bike/${bike._id}`} className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }} aria-label={`View ${bike.brand} ${bike.model} details`}>
            <div className="aspect-video relative overflow-hidden" style={{ background: 'var(--border-base)' }}>
              {bike.images?.[0] ? (
                <img src={bike.images[0]} alt={bike.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No Image</div>
              )}
              <div className="absolute top-2 right-2">
                <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: conditionColors[bike.condition]?.bg, color: conditionColors[bike.condition]?.text }}>
                  {bike.condition}
                </span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.category?.name}</span>
                {bike.zone && (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={10} /> {bike.zone.name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{bike.pricePerHour} TK/hr</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.renter?.name || 'N/A'}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
