import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import api from '../api/axios';
import { useCompare } from '../context/useCompare';

const CompareVehicles = () => {
  const { items, remove, add } = useCompare();
  const [allBikes, setAllBikes] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    api.get('/dashboard/bikes/available')
      .then(res => setAllBikes(res.data))
      .catch(() => {});
  }, []);

  const availableToAdd = allBikes.filter(b => !items.find(i => i._id === b._id));

  const specs = [
    { label: 'Price', key: 'pricePerHour', format: (v) => `${v || 0} TK/hr` },
    { label: 'Category', key: 'category', format: (v) => v?.name || '—' },
    { label: 'Brand', key: 'brand', format: (v) => v || '—' },
    { label: 'Availability', key: 'availability', format: (v) => v !== false ? 'Available' : 'Unavailable' },
    { label: 'Maintenance', key: 'isUnderMaintenance', format: (v) => v ? 'Under Maintenance' : 'OK' },
    { label: 'Description', key: 'description', format: (v) => v || '—' },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 animate-fade-in">
        <div className="text-center glass rounded-2xl p-8 max-w-md">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Vehicles Selected</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Add vehicles to compare from the home page or search results.</p>
          <Link to="/" className="btn-primary inline-block">Browse Vehicles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => window.history.back()} className="flex items-center text-sm mb-2 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Go back">
              <ArrowLeft size={16} className="mr-1" /> Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Compare Vehicles ({items.length}/3)
            </h1>
          </div>
          {items.length < 3 && (
            <button onClick={() => setShowPicker(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: '1px solid var(--accent-text)', color: 'var(--accent-text)' }}>
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </div>

        {/* Comparison Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-0 lg:min-w-[600px]">
            {/* Vehicle Headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
              {items.map(bike => (
                <div key={bike._id} className="glass rounded-2xl overflow-hidden relative" style={{ border: '1px solid var(--border-base)' }}>
                  <button onClick={() => remove(bike._id)} className="absolute top-3 right-3 z-10 p-1.5 rounded-full glass" style={{ color: 'var(--danger-text)' }} aria-label={`Remove ${bike.model}`}>
                    <X size={14} />
                  </button>
                  <img src={bike.images?.[0] || 'https://placehold.co/400x250/1a1a2e/666?text=No+Image'} alt={bike.model} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{bike.model}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.brand}</p>
                    <Link to={`/bike/${bike._id}`} className="mt-2 inline-block text-xs font-medium" style={{ color: 'var(--accent-text)' }}>View Details →</Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Spec Rows */}
            <div className="mt-6 glass rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-base)' }}>
              {specs.map((spec, i) => (
                <div key={spec.key} className="flex" style={{ borderBottom: i < specs.length - 1 ? '1px solid var(--border-base)' : 'none' }}>
                  <div className="w-32 sm:w-40 px-4 py-3 text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}>
                    {spec.label}
                  </div>
                  {items.map(bike => (
                    <div key={bike._id} className="flex-1 px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {spec.format(bike[spec.key])}
                    </div>
                  ))}
                </div>
              ))}

              {/* Pricing Tiers */}
              <div className="flex" style={{ borderTop: '1px solid var(--border-base)' }}>
                <div className="w-32 sm:w-40 px-4 py-3 text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}>
                  Pricing Tiers
                </div>
                {items.map(bike => (
                  <div key={bike._id} className="flex-1 px-4 py-3">
                    {bike.packages?.length > 0 ? (
                      <div className="space-y-1">
                        {bike.packages.map((tier, j) => (
                          <div key={j} className="text-xs flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                            <span>{tier.label}</span>
                            <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{tier.hourlyRate} TK/hr</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Base rate only</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Vehicle Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full sm:max-w-lg glass rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Vehicle to Compare</h3>
            <div className="space-y-2">
              {availableToAdd.map(bike => (
                <button key={bike._id} onClick={() => { add(bike); setShowPicker(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-amber-500/10" style={{ border: '1px solid var(--border-base)' }}>
                  <img src={bike.images?.[0] || 'https://placehold.co/48x48/1a1a2e/666?text=No'} alt={bike.model} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bike.model}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.brand} • {bike.pricePerHour} TK/hr</p>
                  </div>
                  <Plus size={16} style={{ color: 'var(--accent-text)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompareVehicles);
