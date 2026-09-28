"use client";
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Lock } from 'lucide-react';

/**
 * Anonymous teaser map for the homepage categories section. Shows pickup-zone
 * pins only — public business info. Makes NO network calls (no session, no
 * tracking API), so no live position can ever leak to a signed-out visitor.
 * PRIVACY: never add live markers here; the live feed is session-gated.
 */
const ZONE_PINS: { name: string; lat: number; lng: number }[] = [
  { name: 'Laboni Beach', lat: 21.4272, lng: 91.97 },
  { name: 'Marine Drive', lat: 21.38, lng: 92.0 },
  { name: 'Inani Beach', lat: 21.13, lng: 92.05 },
  { name: 'Himchari', lat: 21.34, lng: 92.0 },
  { name: 'Kolatoli', lat: 21.415, lng: 91.976 },
  { name: 'Sea Beach', lat: 21.425, lng: 91.972 },
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
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-max max-w-[92%]">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 pl-4 pr-2 py-2">
          <MapPin size={18} className="text-orange-500 shrink-0" />
          <p className="text-[13px] font-bold text-slate-900">See live bikes on this map</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-black text-white text-[13px] font-bold px-4 py-2 rounded-lg transition-all shrink-0">
            <Lock size={13} /> Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ZoneTeaserMap;
