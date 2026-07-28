import { useState, useEffect, memo } from 'react';
import { Navigation, MapPin, Clock, ArrowRight, ExternalLink, RotateCcw } from 'lucide-react';
import api from '../api/axios';

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateTime = (distanceKm) => {
  const avgSpeed = distanceKm < 10 ? 30 : distanceKm < 30 ? 40 : 50;
  return Math.round((distanceKm / avgSpeed) * 60);
};

const RoutePlanner = ({ className = '' }) => {
  const [zones, setZones] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/zones/active')
      .then(res => setZones(res.data))
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, []);

  const originZone = zones.find(z => z._id === origin);
  const destZone = zones.find(z => z._id === destination);

  const distance = originZone?.center && destZone?.center
    ? haversine(originZone.center.lat, originZone.center.lng, destZone.center.lat, destZone.center.lng)
    : null;

  const travelTime = distance ? estimateTime(distance) : null;

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const reset = () => {
    setOrigin('');
    setDestination('');
  };

  const mapsUrl = originZone?.center && destZone?.center
    ? `https://www.google.com/maps/dir/${originZone.center.lat},${originZone.center.lng}/${destZone.center.lat},${destZone.center.lng}`
    : null;

  if (loading) {
    return (
      <div className={`glass rounded-2xl p-5 ${className}`} style={{ border: '1px solid var(--border-base)' }}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded" style={{ background: 'var(--input-bg)' }} />
          <div className="h-10 rounded-lg" style={{ background: 'var(--input-bg)' }} />
          <div className="h-10 rounded-lg" style={{ background: 'var(--input-bg)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-2xl p-5 ${className}`} style={{ border: '1px solid var(--border-base)' }}>
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Navigation size={16} style={{ color: 'var(--accent-text)' }} />
        Plan Your Route
      </h3>

      <div className="space-y-3">
        {/* Origin */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>From</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success-text)' }} />
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer min-h-11"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}
              aria-label="Select origin zone"
            >
              <option value="">Select pickup zone</option>
              {zones.map(z => (
                <option key={z._id} value={z._id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap + Reset buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={swap}
            className="p-1.5 rounded-lg transition-all hover:bg-amber-500/10"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Swap origin and destination"
          >
            <RotateCcw size={14} className="rotate-90" />
          </button>
          {(origin || destination) && (
            <button
              onClick={reset}
              className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
              style={{ color: 'var(--danger-text)' }}
              aria-label="Reset route"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>To</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--danger-text)' }} />
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer min-h-11"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}
              aria-label="Select destination zone"
            >
              <option value="">Select drop-off zone</option>
              {zones.map(z => (
                <option key={z._id} value={z._id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Result */}
        {distance !== null && (
          <div className="mt-4 p-4 rounded-xl animate-slide-up" style={{ background: 'var(--accent-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: 'var(--accent-text)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Estimated Distance</span>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>
                {distance.toFixed(1)} km
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: 'var(--accent-text)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Est. Travel Time</span>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>
                ~{travelTime} min
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: originZone?.color }} />
              <span>{originZone?.name}</span>
              <ArrowRight size={12} />
              <span className="w-2 h-2 rounded-full" style={{ background: destZone?.color }} />
              <span>{destZone?.name}</span>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--accent-text)', color: 'white' }}
              >
                <ExternalLink size={14} />
                Open in Google Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RoutePlanner);
