"use client";
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { PICKUP_SPOTS, PICKUP_SPOT_COORDS } from '../lib/pickupSpots';

/**
 * Anonymous teaser map for the homepage categories section. Shows pickup-zone
 * pins only — public business info. Makes NO network calls (no session, no
 * tracking API), so no live position can ever leak to a signed-out visitor.
 * PRIVACY: never add live markers here; the live feed is session-gated.
 *
 * Coordinates come from `PICKUP_SPOT_COORDS` (real positions, verified on
 * land) and the names/order come from `PICKUP_SPOTS`, so the map can never
 * drift from the hero's pickup dropdown again.
 */
const ZONE_PINS: { name: string; lat: number; lng: number }[] = PICKUP_SPOTS
  .filter(name => PICKUP_SPOT_COORDS[name])
  .map(name => ({ name, lat: PICKUP_SPOT_COORDS[name][0], lng: PICKUP_SPOT_COORDS[name][1] }));

const zoneIcon = L.divIcon({
  className: '',
  html: '<div style="background:#f97316;color:#fff;border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,.4);font-size:15px;">◎</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const ZoneTeaserMap = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-[320px] sm:h-[380px]">
      <MapContainer center={[21.35, 92.0]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ZONE_PINS.map(spot => (
          <Marker key={spot.name} position={[spot.lat, spot.lng]} icon={zoneIcon}>
            <Popup>
              <p className="font-bold text-sm">{spot.name}</p>
              <p className="text-xs text-slate-500">Pickup zone</p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {/* Compact corner pill (no auth buttons — navbar owns those). Bottom-left
          so it never covers the central pin cluster; z below Leaflet's marker
          pane (600) so pins stay visible and clickable above it. */}
      <div className="absolute bottom-3 left-3 z-[500]">
        <Link href="/login"
          className="flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg border border-slate-200 pl-3 pr-4 py-2 hover:shadow-xl transition-shadow"
          aria-label="Sign in to see live bikes on this map">
          <MapPin size={15} className="text-orange-500 shrink-0" />
          <span className="text-xs font-bold text-slate-900 whitespace-nowrap">See live bikes on this map</span>
        </Link>
      </div>
    </div>
  );
};

export default ZoneTeaserMap;
