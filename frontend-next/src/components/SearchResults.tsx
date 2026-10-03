"use client";
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';

import { LayoutGrid, List, Map as MapIcon, Star, MapPin, Calendar } from 'lucide-react';
import VehicleCard from './VehicleCard';
import SafeImage from './SafeImage';

// Leaflet touches `window` at import — client-only like the homepage map.
const LiveFleetMap = dynamic(() => import('./LiveFleetMap'), { ssr: false });
const ZoneTeaserMap = dynamic(() => import('./ZoneTeaserMap'), { ssr: false });

const conditionCls: Record<string, string> = {
  excellent: 'bg-teal-50 text-teal-700 border-teal-200',
  good: 'bg-sky-50 text-sky-700 border-sky-200',
  fair: 'bg-amber-50 text-amber-700 border-amber-200',
  poor: 'bg-red-50 text-red-600 border-red-200',
};

import type { Bike, ReviewStats } from '@/types';

type ViewMode = 'grid' | 'list' | 'map';

const condClass = (c?: string): string => conditionCls[c ?? ''] ?? 'bg-slate-100 text-slate-500 border-slate-200';
const catName = (bike: Bike): string => (typeof bike.category === 'string' ? undefined : bike.category?.name) || '';
// Models like "Toyota Premio 2017" already carry the brand — don't print it twice.
const displayName = (bike: Bike): string => {
  const brand = (bike.brand || '').trim();
  const model = (bike.model || '').trim();
  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return `${brand} ${model}`.trim();
};

/** Compact row for the map split-view. */
const CompactRow = ({ bike }: { bike: Bike }) => (
  <Link href={`/bike/${bike._id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:shadow-md hover:-translate-y-px transition-all" aria-label={`View ${bike.model} details`}>
    <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 relative bg-slate-100">
      <SafeImage src={bike.images?.[0]} alt={bike.model ?? ''} fill sizes="160px" className="object-cover" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-900 truncate">{displayName(bike)}</p>
      <p className="text-xs text-slate-500">{catName(bike) || 'Vehicle'}</p>
    </div>
    <p className="text-sm font-black text-red-600 flex-shrink-0">{bike.pricePerHour} <span className="text-[11px] font-bold text-slate-500">TK/hr</span></p>
  </Link>
);

/** Full row for the list view. */
const ListRow = ({ bike, rating }: { bike: Bike; rating?: ReviewStats }) => (
  <Link href={`/bike/${bike._id}`} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-lg transition-all" aria-label={`View ${bike.model} details`}>
    <div className="sm:w-44 h-40 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 relative bg-slate-100">
      <SafeImage src={bike.images?.[0]} alt={bike.model ?? ''} fill sizes="352px" className="object-cover" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-black text-slate-900">{displayName(bike)}</p>
        {bike.condition && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${condClass(bike.condition)}`}>{bike.condition}</span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{catName(bike) || 'Vehicle'}</p>
      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
        <Star size={12} fill={rating && (rating.avgRating ?? 0) > 0 ? '#f59e0b' : 'none'} color={rating && (rating.avgRating ?? 0) > 0 ? '#f59e0b' : '#cbd5e1'} />
        {rating && (rating.total ?? 0) > 0 ? <><b className="text-slate-800">{(rating.avgRating ?? 0).toFixed(1)}</b> ({rating.total} reviews)</> : 'No reviews'}
        <span className="inline-flex items-center gap-1 ml-2"><MapPin size={12} /> Cox&apos;s Bazar</span>
      </div>
    </div>
    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 sm:pr-1">
      <p className="text-xl font-black text-red-600">{bike.pricePerHour} <span className="text-xs font-bold text-slate-500">TK/hr</span></p>
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-neutral-900 text-white">
        <Calendar size={14} /> Rent Now
      </span>
    </div>
  </Link>
);

const SearchResults = ({ bikes, ratings, isAuthed }: { bikes: Bike[]; ratings?: Record<string, ReviewStats>; isAuthed: boolean }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const toggle = (
    <div className="flex gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-sm" role="tablist" aria-label="Result layout">
      {([['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view'], ['map', MapIcon, 'Map view']] as const).map(([mode, Icon, label]) => (
        <button key={mode} onClick={() => setViewMode(mode)} role="tab" aria-selected={viewMode === mode} aria-label={label}
          className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  );

  if (viewMode === 'map') {
    return (
      <div>
        <div className="flex justify-end mb-3">{toggle}</div>
        {isAuthed ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 order-2 xl:order-1">
              {bikes.map(bike => (
                <CompactRow key={bike._id} bike={bike} />
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 h-[420px] xl:h-[560px] xl:sticky xl:top-4 order-1 xl:order-2">
              <LiveFleetMap fullHeight filterBikeIds={bikes.map(b => b._id)} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-slate-600"><b className="text-slate-900">Live map is for members.</b> Pickup zones below — <Link href="/login" className="font-bold text-orange-600 hover:underline">sign in</Link> to see live bikes.</p>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 h-[420px]">
              <ZoneTeaserMap />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div>
        <div className="flex justify-end mb-3">{toggle}</div>
        <div className="space-y-3">
          {bikes.map(bike => (
            <ListRow key={bike._id} bike={bike} rating={ratings?.[bike._id]} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">{toggle}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {bikes.map(bike => (
          <VehicleCard key={bike._id} bike={bike} rating={ratings?.[bike._id]} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
