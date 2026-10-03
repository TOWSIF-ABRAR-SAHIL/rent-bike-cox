"use client";
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

/**
 * Anonymous teaser map for the homepage categories section. Shows pickup-zone
 * pins only — public business info. Makes NO network calls (no session, no
 * tracking API), so no live position can ever leak to a signed-out visitor.
 * PRIVACY: never add live markers here; the live feed is session-gated.
 *
 * Pin coordinates are display offsets, not survey GPS: Laboni / Kolatoli /
 * Sea Beach sit within ~1km of each other and their 30px pins would stack
 * into one blob at zoom 10, so each is nudged apart to stay separately
 * clickable. Names and ordering match PICKUP_SPOTS.
 */
const ZONE_PINS: { name: string; lat: number; lng: number }[] = [
  { name: 'Laboni Beach', lat: 21.4272, lng: 91.97 },
  { name: 'Marine Drive', lat: 21.38, lng: 92.0 },
  { name: 'Inani Beach', lat: 21.13, lng: 92.05 },
  { name: 'Himchari', lat: 21.34, lng: 92.0 },
  { name: 'Kolatoli', lat: 21.406, lng: 91.984 },
  { name: 'Sea Beach', lat: 21.436, lng: 91.962 },
];

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
