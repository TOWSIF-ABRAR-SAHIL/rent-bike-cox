import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowLeft, Navigation, Bike, Info, Star, Route } from 'lucide-react';
import ZoneMap from '../components/ZoneMap';
import RoutePlanner from '../components/RoutePlanner';

const ZoneExplorer = () => {
  const [selectedZone, setSelectedZone] = useState(null);

  const zoneProps = selectedZone?.properties;

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => window.history.back()} className="flex items-center text-sm mb-6 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Go back">
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <MapPin size={28} className="inline mr-2" style={{ color: 'var(--accent-text)' }} />
            Cox's Bazar Zones
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Explore rental zones across Cox's Bazar. Click a zone on the map or list to see details.
          </p>
        </div>

        {/* Route Planner */}
        <div className="mb-6">
          <RoutePlanner />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <ZoneMap
              height="500px"
              showZoneList={false}
              onZoneClick={(zone) => setSelectedZone(zone)}
              selectedZone={selectedZone}
            />
          </div>

          {/* Zone List + Details */}
          <div className="space-y-4">
            {selectedZone && zoneProps ? (
              <div className="glass rounded-2xl p-5 border animate-slide-up" style={{ borderColor: zoneProps.color + '40' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ background: zoneProps.color }} />
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{zoneProps.name}</h2>
                </div>

                {zoneProps.distanceFromCenter && (
                  <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Navigation size={14} style={{ color: zoneProps.color }} />
                    <span>{zoneProps.distanceFromCenter} from city center</span>
                  </div>
                )}

                {zoneProps.typicalRentPrice && (
                  <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: zoneProps.color }}>💰</span>
                    <span>{zoneProps.typicalRentPrice}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Bike size={14} style={{ color: zoneProps.color }} />
                  <span>{zoneProps.bikeCount} vehicles available</span>
                </div>

                {zoneProps.highlights?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Star size={12} /> Highlights
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {zoneProps.highlights.map((h, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-xs" style={{ background: zoneProps.color + '20', color: zoneProps.color }}>
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link
                    to={`/search?zone=${zoneProps.slug}`}
                    className="flex-1 text-center text-sm py-2.5 rounded-xl font-medium transition-all"
                    style={{ background: zoneProps.color, color: 'white' }}
                  >
                    View Vehicles
                  </Link>
                  <button
                    onClick={() => setSelectedZone(null)}
                    className="px-3 py-2.5 rounded-xl text-sm border"
                    style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-5 text-center" style={{ border: '1px solid var(--border-base)' }}>
                <MapPin size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Click a zone on the map to see details
                </p>
              </div>
            )}

            <ZoneMap
              height="300px"
              showZoneList={true}
              onZoneClick={(zone) => setSelectedZone(zone)}
              selectedZone={selectedZone}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ZoneExplorer);
