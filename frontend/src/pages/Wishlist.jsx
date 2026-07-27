import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useWishlist } from '../context/useWishlist';

const Wishlist = () => {
  const { ids, toggle, clear } = useWishlist();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all(ids.map(id => api.get(`/dashboard/bikes/${id}`).then(r => r.data).catch(() => null)))
      .then(results => setBikes(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [ids]);

  if (ids.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 animate-fade-in">
        <div className="text-center glass rounded-2xl p-8 max-w-md">
          <Heart size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Favorites Yet</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Save vehicles you like by clicking the heart icon.</p>
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
              <Heart size={28} className="inline mr-2" style={{ color: '#ef4444' }} />
              My Favorites ({ids.length})
            </h1>
          </div>
          <button onClick={clear} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
            <Trash2 size={14} /> Clear All
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse" style={{ border: '1px solid var(--border-base)' }}>
                <div className="h-52" style={{ background: 'var(--input-bg)' }} />
                <div className="p-5 space-y-2">
                  <div className="h-5 w-3/4 rounded" style={{ background: 'var(--input-bg)' }} />
                  <div className="h-4 w-1/2 rounded" style={{ background: 'var(--input-bg)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map(bike => (
              <div key={bike._id} className="glass rounded-2xl overflow-hidden card-hover group" style={{ border: '1px solid var(--border-base)' }}>
                <div className="relative overflow-hidden">
                  <Link to={`/bike/${bike._id}`} className="block">
                    <img src={bike.images?.[0] || 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'} alt={bike.model} className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-110" />
                  </Link>
                  <button onClick={() => toggle(bike._id)} className="absolute top-3 right-3 p-2.5 rounded-full glass" aria-label="Remove from favorites">
                    <Heart size={16} fill="#ef4444" color="#ef4444" />
                  </button>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1 gradient-primary rounded-lg text-xs font-bold text-white shadow-lg">
                      {bike.pricePerHour} TK/hr
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <Link to={`/bike/${bike._id}`}>
                    <h3 className="font-bold text-lg mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{bike.model}</h3>
                  </Link>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{bike.brand}</p>
                  <Link to={`/bike/${bike._id}`} className="block text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:border-amber-500/50"
                    style={{ border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Wishlist);
