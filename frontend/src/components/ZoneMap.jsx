import { useState, useEffect, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useTheme } from '../context/useTheme';
import { MapPin, Bike } from 'lucide-react';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Cox's Bazar center coordinates
const COXS_BAZAR_CENTER = [21.4200, 92.0100];

const createZoneIcon = (color) => L.divIcon({
  html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: 'zone-marker-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
});

// Component to handle map re-centering
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom());
  }, [map, center, zoom]);
  return null;
}

const ZoneMap = ({
  center = COXS_BAZAR_CENTER,
  zoom = 12,
  height = '400px',
  showZoneList = false,
  onZoneClick = null,
  selectedZone = null,
  className = '',
}) => {
  const { theme } = useTheme();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/zones/geojson')
      .then(res => setZones(res.features || []))
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, []);

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const tileAttribution = theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  return (
    <div className={`rounded-2xl overflow-hidden glass ${className}`} style={{ border: '1px solid var(--border-base)' }}>
      <div style={{ height, width: '100%' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          <MapRecenter center={selectedZone?.center ? [selectedZone.center.lat, selectedZone.center.lng] : null} zoom={14} />

          {zones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            const icon = createZoneIcon(zone.properties.color);

            return (
              <div key={zone.id}>
                {zone.geometry?.type === 'Polygon' ? (
                  <Polygon
                    positions={zone.geometry.coordinates[0].map(c => [c[1], c[0]])}
                    pathOptions={{
                      color: zone.properties.color,
                      fillColor: zone.properties.color,
                      fillOpacity: isSelected ? 0.35 : 0.15,
                      weight: isSelected ? 3 : 2,
                    }}
                  >
                    <Popup>
                      <div className="zone-popup">
                        <h3 style={{ color: zone.properties.color }}>{zone.properties.name}</h3>
                        <p>{zone.properties.bikeCount} vehicles available</p>
                        {zone.properties.distanceFromCenter && (
                          <p>📍 {zone.properties.distanceFromCenter} from city center</p>
                        )}
                        {zone.properties.typicalRentPrice && (
                          <p>💰 {zone.properties.typicalRentPrice}</p>
                        )}
                        {zone.properties.highlights?.length > 0 && (
                          <div className="highlights">
                            {zone.properties.highlights.map((h, i) => (
                              <span key={i}>{h}</span>
                            ))}
                          </div>
                        )}
                        <Link
                          to={`/search?zone=${zone.properties.slug}`}
                          className="mt-2 inline-block text-xs font-medium px-3 py-1 rounded-lg"
                          style={{ background: zone.properties.color, color: 'white' }}
                        >
                          View Vehicles →
                        </Link>
                      </div>
                    </Popup>
                  </Polygon>
                ) : zone.geometry?.type === 'Point' ? (
                  <Marker
                    position={[zone.geometry.coordinates[1], zone.geometry.coordinates[0]]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="zone-popup">
                        <h3 style={{ color: zone.properties.color }}>{zone.properties.name}</h3>
                        <p>{zone.properties.bikeCount} vehicles available</p>
                        {zone.properties.distanceFromCenter && (
                          <p>📍 {zone.properties.distanceFromCenter} from city center</p>
                        )}
                        {zone.properties.highlights?.length > 0 && (
                          <div className="highlights">
                            {zone.properties.highlights.map((h, i) => (
                              <span key={i}>{h}</span>
                            ))}
                          </div>
                        )}
                        <Link
                          to={`/search?zone=${zone.properties.slug}`}
                          className="mt-2 inline-block text-xs font-medium px-3 py-1 rounded-lg"
                          style={{ background: zone.properties.color, color: 'white' }}
                        >
                          View Vehicles →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ) : null}
              </div>
            );
          })}
        </MapContainer>
      </div>

      {showZoneList && (
        <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--border-base)' }}>
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading zones...</p>
          ) : zones.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No zones found</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => onZoneClick?.(zone)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all ${
                    selectedZone?.id === zone.id ? 'ring-2' : ''
                  }`}
                  style={{
                    background: selectedZone?.id === zone.id ? 'var(--accent-bg)' : 'var(--input-bg)',
                    ...(selectedZone?.id === zone.id ? { '--tw-ring-color': zone.properties.color } : {}),
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: zone.properties.color }} />
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{zone.properties.name}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{zone.properties.bikeCount} vehicles</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(ZoneMap);
