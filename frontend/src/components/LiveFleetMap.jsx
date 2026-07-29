import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io as socketIO } from 'socket.io-client';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = API.replace('/api', '');
const COX_BAZAR = [21.4200, 92.0100];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_STYLES = {
  Bike: { icon: '🏍', bg: '#f59e0b', trail: '#f59e0b' },
  Car: { icon: '🚗', bg: '#3b82f6', trail: '#3b82f6' },
  Jeep: { icon: '🛻', bg: '#22c55e', trail: '#22c55e' },
  default: { icon: '📍', bg: '#8b5cf6', trail: '#8b5cf6' },
};

function createVehicleIcon(category, speed = 0, battery = 100) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
  const batteryColor = battery > 50 ? '#22c55e' : battery > 20 ? '#f59e0b' : '#ef4444';
  const speedClass = speed > 0 ? 'animate-pulse' : '';
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `<div class="marker-body ${speedClass}" style="background:${style.bg};">
      <span class="marker-icon">${style.icon}</span>
      <div class="marker-battery" style="background:${batteryColor};width:${Math.min(battery, 100)}%"></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

const popupTemplate = (b) => {
  const style = CATEGORY_STYLES[b.category] || CATEGORY_STYLES.default;
  const batteryColor = b.battery > 50 ? '#22c55e' : b.battery > 20 ? '#f59e0b' : '#ef4444';
  return `<div class="tracking-popup">
    <div class="popup-header" style="border-left:3px solid ${style.bg};">
      <strong>${b.brand} ${b.model}</strong>
      <span class="popup-badge" style="background:${style.bg}20;color:${style.bg};">${b.category}</span>
    </div>
    <div class="popup-stats">
      ${b.speed ? `<div class="stat"><span class="stat-label">Speed</span><span class="stat-value">${(b.speed * 3.6).toFixed(0)} km/h</span></div>` : ''}
      <div class="stat"><span class="stat-label">Battery</span><span class="stat-value" style="color:${batteryColor}">${b.battery}%</span></div>
      ${b.heading ? `<div class="stat"><span class="stat-label">Heading</span><span class="stat-value">${b.heading}°</span></div>` : ''}
      <div class="stat"><span class="stat-label">Updated</span><span class="stat-value">${new Date(b.updatedAt).toLocaleTimeString()}</span></div>
    </div>
    ${b.image ? `<img src="${b.image}" class="popup-image" />` : ''}
  </div>`;
};

function TrailLayer({ trailData }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) map.removeLayer(layerRef.current);
    if (!trailData || trailData.length < 2) return;

    const polylines = [];
    const grouped = {};
    trailData.forEach(p => {
      if (!grouped[p.bikeId]) grouped[p.bikeId] = { latlngs: [], color: p.color || '#8b5cf6' };
      grouped[p.bikeId].latlngs.push([p.lat, p.lng]);
    });

    Object.values(grouped).forEach(g => {
      const polyline = L.polyline(g.latlngs, {
        color: g.color, weight: 3, opacity: 0.6,
        dashArray: '8 8', lineCap: 'round',
      }).addTo(map);
      polylines.push(polyline);
    });

    const group = L.layerGroup(polylines);
    layerRef.current = group;

    return () => { polylines.forEach(p => map.removeLayer(p)); };
  }, [trailData, map]);

  return null;
}

function FitBounds({ markers }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (markers.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(markers.map(m => [m.coordinates[1], m.coordinates[0]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      fitted.current = true;
    }
  }, [markers, map]);

  return null;
}

function LegendOverlay() {
  const map = useMap();
  const legendRef = useRef(null);

  useEffect(() => {
    const Legend = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create('div', 'tracking-legend');
        div.innerHTML = Object.entries(CATEGORY_STYLES).map(([name, style]) =>
          `<div class="legend-item"><span class="legend-dot" style="background:${style.bg}"></span>${name}</div>`
        ).join('');
        return div;
      },
    });
    const legend = new Legend({ position: 'bottomleft' });
    legend.addTo(map);
    legendRef.current = legend;
    return () => legend.remove();
  }, [map]);

  return null;
}

function ConnectionStatus({ connected }) {
  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: '10px', marginLeft: '50px', zIndex: 1000 }}>
      <div className="connection-badge" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 20, fontSize: 11,
        background: connected ? '#22c55e20' : '#ef444420',
        color: connected ? '#22c55e' : '#ef4444',
        border: `1px solid ${connected ? '#22c55e40' : '#ef444440'}`,
        backdropFilter: 'blur(4px)',
      }}>
        <span className={`status-dot ${connected ? 'live' : 'dead'}`}
          style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
        {connected ? 'Live' : 'Reconnecting...'}
      </div>
    </div>
  );
}

const categoryIcons = { Bike: '🏍', Car: '🚗', Jeep: '🛻' };

const LiveFleetMap = ({ height = '500px', showRecenter = true, filterBikeIds } = {}) => {
  const { token } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [trailData, setTrailData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBike, setSelectedBike] = useState(null);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const socketRef = useRef(null);
  const markerMapRef = useRef({});
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    api.get('/tracking', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      const data = filterBikeIds
        ? res.data.filter(b => filterBikeIds.includes(b._id))
        : res.data;
      setMarkers(data);
    }).catch(() => setError('Failed to load live locations'))
      .finally(() => setLoading(false));
  }, [token, filterBikeIds]);

  useEffect(() => {
    const ws = socketIO(WS_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = ws;

    ws.on('connect', () => setConnected(true));
    ws.on('disconnect', () => setConnected(false));
    ws.on('reconnect', () => setConnected(true));

    ws.on('location:update', (data) => {
      setMarkers(prev => {
        const idx = prev.findIndex(m => m._id === data.bikeId);
        const updated = {
          _id: data.bikeId, model: data.model, brand: data.brand,
          category: data.category || prev[idx]?.category || 'Vehicle',
          image: data.image || prev[idx]?.image || null,
          coordinates: data.coordinates,
          speed: data.speed || 0, heading: data.heading || 0,
          battery: data.battery ?? 100, accuracy: data.accuracy || 0,
          updatedAt: data.updatedAt,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        }
        return [...prev, updated];
      });

      setTrailData(prev => {
        const point = {
          bikeId: data.bikeId, lat: data.coordinates[1], lng: data.coordinates[0],
          color: (CATEGORY_STYLES[data.category] || CATEGORY_STYLES.default).trail,
          ts: Date.now(),
        };
        const next = [...prev, point];
        const cutoff = Date.now() - 60000;
        return next.filter(p => p.ts > cutoff).slice(-200);
      });
    });

    return () => ws.disconnect();
  }, []);

  const handleMarkerClick = useCallback((bike) => {
    setSelectedBike(bike);
  }, []);

  const filteredMarkers = useMemo(() => {
    let result = markers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.model.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All') {
      result = result.filter(m => m.category === categoryFilter);
    }
    return result;
  }, [markers, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(markers.map(m => m.category));
    return ['All', ...Array.from(set)];
  }, [markers]);

  const center = markers.length > 0
    ? [markers[0].coordinates[1], markers[0].coordinates[0]]
    : COX_BAZAR;

  return (
    <div className="rounded-2xl overflow-hidden glass" style={{ border: '1px solid var(--border-base)' }}>
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border-base)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Live Fleet</span>
          {loading && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</span>}
          {!loading && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              {markers.length} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.length > 1 && categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all ${categoryFilter === c ? 'gradient-primary text-white' : ''}`}
              style={categoryFilter !== c ? { color: 'var(--text-muted)', background: 'var(--input-bg)' } : {}}
            >
              {c === 'All' ? 'All' : `${categoryIcons[c] || '📍'} ${c}`}
            </button>
          ))}
          <div className="relative">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search vehicle..."
              className="text-xs pl-7 pr-2 py-1.5 rounded-lg"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-base)', width: 140, outline: 'none' }}
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      <div style={{ height, width: '100%', position: 'relative' }}>
        {!loading && (
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds markers={filteredMarkers} />
            <LegendOverlay />
            <ConnectionStatus connected={connected} />
            <TrailLayer trailData={trailData} />
            <MarkerCluster
              markers={filteredMarkers}
              markerMapRef={markerMapRef}
              clusterRef={clusterRef}
              onMarkerClick={handleMarkerClick}
            />
            {showRecenter && <RecenterButton />}
          </MapContainer>
        )}
      </div>

      {selectedBike && (
        <div className="px-4 py-3 flex items-center gap-3 animate-slide-up"
          style={{ borderTop: '1px solid var(--border-base)', background: 'var(--accent-bg)' }}>
          {selectedBike.image && (
            <img src={selectedBike.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {selectedBike.brand} {selectedBike.model}
            </p>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{selectedBike.category}</span>
              <span>🚀 {(selectedBike.speed * 3.6).toFixed(0)} km/h</span>
              <span style={{ color: selectedBike.battery > 50 ? '#22c55e' : selectedBike.battery > 20 ? '#f59e0b' : '#ef4444' }}>
                🔋 {selectedBike.battery}%
              </span>
            </div>
          </div>
          <button onClick={() => setSelectedBike(null)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}
          >
            ✕
          </button>
        </div>
      )}

      <style>{`
        .custom-vehicle-marker { background: none !important; border: none !important; }
        .marker-body {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative; font-size: 16px;
          transition: transform 0.3s ease;
        }
        .marker-body:hover { transform: scale(1.15); }
        .marker-icon { line-height: 1; }
        .marker-battery {
          position: absolute; bottom: -3px; left: 4px; height: 4px;
          border-radius: 2px; transition: width 0.5s ease;
        }
        .animate-pulse { animation: markerPulse 2s ease-in-out infinite; }
        @keyframes markerPulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 16px rgba(245,158,11,0.5); }
        }
        .tracking-popup { min-width: 200px; }
        .popup-header { padding: 6px 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .popup-header strong { font-size: 14px; white-space: nowrap; }
        .popup-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
        .popup-stats { padding: 6px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .stat { display: flex; flex-direction: column; }
        .stat-label { font-size: 10px; color: #999; }
        .stat-value { font-size: 13px; font-weight: 600; color: #333; }
        .popup-image { width: 100%; height: 80px; object-fit: cover; border-radius: 0 0 8px 8px; }
        .tracking-legend {
          background: rgba(255,255,255,0.95); padding: 8px 12px; border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px; line-height: 1.8;
        }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .leaflet-container { background: #1a1a2e; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; overflow: hidden; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>
    </div>
  );
};

function MarkerCluster({ markers, markerMapRef, clusterRef, onMarkerClick }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let bg = '#f59e0b';
        if (count > 10) bg = '#ef4444';
        else if (count > 5) bg = '#8b5cf6';
        return L.divIcon({
          html: `<div style="background:${bg};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);color:white;font-weight:700;font-size:13px;">${count}</div>`,
          className: 'cluster-icon', iconSize: [36, 36],
        });
      },
    });

    const newMarkers = {};
    markers.forEach(m => {
      const pos = [m.coordinates[1], m.coordinates[0]];
      if (newMarkers[m._id]) {
        newMarkers[m._id].setLatLng(pos);
        return;
      }
      const marker = L.marker(pos, { icon: createVehicleIcon(m.category, m.speed, m.battery) });
      marker.bindPopup(popupTemplate(m), { maxWidth: 260, className: 'tracking-popup-wrapper' });
      marker.on('click', () => onMarkerClick(m));
      mcg.addLayer(marker);
      newMarkers[m._id] = marker;
    });

    markerMapRef.current = newMarkers;
    map.addLayer(mcg);
    clusterGroupRef.current = mcg;
    clusterRef.current = mcg;

    return () => map.removeLayer(mcg);
  }, [markers, map, onMarkerClick, markerMapRef, clusterRef]);

  return null;
}

function RecenterButton() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <button
        onClick={() => {
          if (map._layers && Object.keys(map._layers).length > 0) {
            const bounds = [];
            map.eachLayer(l => {
              if (l instanceof L.Marker) bounds.push(l.getLatLng());
            });
            if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 14 });
            else map.setView(COX_BAZAR, 12);
          } else map.setView(COX_BAZAR, 12);
        }}
        className="leaflet-control-zoom"
        style={{
          width: 34, height: 34, borderRadius: 4, cursor: 'pointer',
          background: 'white', border: '2px solid rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}
        title="Fit markers in view"
      >
        ⌖
      </button>
    </div>
  );
}

export default LiveFleetMap;
