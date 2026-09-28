"use client";
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Heart, GitCompareArrows, Calendar, BadgeCheck, Gauge, Navigation, Bike, Clock, MapPin, Shield } from 'lucide-react';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import type { Bike as BikeType, ReviewStats } from '@/types';

export type VehicleBadge = 'featured' | 'top' | null;

interface VehicleCardProps {
  bike: BikeType;
  rating?: ReviewStats;
  badge?: VehicleBadge;
}

/** Shared vehicle card: home grid, featured row, search results. */
const VehicleCard = ({ bike, rating, badge = null }: VehicleCardProps) => {
  const { toggle: toggleCompare, has: hasCompare } = useCompare();
  const { toggle: toggleWishlist, has: hasWish } = useWishlist();
  const [imgOk, setImgOk] = useState(true);
  const src = bike.images?.[0];
  const conditionLabel = bike.condition ? bike.condition.charAt(0).toUpperCase() + bike.condition.slice(1) : 'Good';
  const packageStart = bike.packages?.[0]?.minHours;
  const categoryName = typeof bike.category === 'string' ? undefined : bike.category?.name;

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="relative overflow-hidden group">
        <Link href={`/bike/${bike._id}`} aria-label={`View ${bike.model}`}>
          {src && imgOk ? (
            <Image src={src} alt={bike.model ?? ''}
              width={400} height={300}
              className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgOk(false)} />
          ) : (
            <div className="w-full h-56 flex flex-col items-center justify-center gap-2 bg-slate-100">
              <Bike size={44} className="text-slate-300" />
              <span className="text-xs font-semibold text-slate-400">Photo coming soon</span>
            </div>
          )}
        </Link>
        {badge && (
          <div className="absolute top-5 -left-10 rotate-[-35deg] px-10 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-md"
            style={{ background: badge === 'featured' ? '#dc2626' : '#f97316' }}>
            {badge === 'featured' ? 'Featured' : 'Top Rated'}
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(bike._id); }}
            className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center transition-all hover:scale-110"
            aria-label={hasWish(bike._id) ? 'Remove from favorites' : 'Add to favorites'}>
            <Heart size={14} fill={hasWish(bike._id) ? '#ef4444' : 'none'} color={hasWish(bike._id) ? '#ef4444' : '#64748b'} />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(bike); }}
            className={`w-8 h-8 rounded-full bg-white shadow flex items-center justify-center transition-all hover:scale-110 ${hasCompare(bike._id) ? 'ring-2 ring-orange-500' : ''}`}
            aria-label={hasCompare(bike._id) ? 'Remove from comparison' : 'Add to comparison'}>
            <GitCompareArrows size={14} color={hasCompare(bike._id) ? '#f97316' : '#64748b'} />
          </button>
        </div>
        {categoryName && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow">
            {categoryName}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-black text-slate-900 leading-snug">
            <Link href={`/bike/${bike._id}`} className="hover:text-orange-600 transition-colors">{bike.model}</Link>
          </h3>
          {bike.isVerified && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700">
              <BadgeCheck size={13} /> Verified
            </span>
          )}
        </div>
        <p className="text-[13px] text-slate-500 mt-0.5">{bike.brand}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={13} fill={rating && star <= Math.round(rating.avgRating || 0) ? '#f59e0b' : 'none'} color={rating && star <= Math.round(rating.avgRating || 0) ? '#f59e0b' : '#cbd5e1'} />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {rating ? <><b className="text-slate-800">({(rating.avgRating || 0).toFixed(1)})</b> {rating.total || 0} Reviews</> : 'No reviews'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-y-2.5 gap-x-2 mt-4 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Gauge size={13} className="text-slate-400" />{conditionLabel}</span>
          <span className="inline-flex items-center gap-1.5"><Navigation size={13} className="text-slate-400" />{(bike.currentMileage ?? 0) > 0 ? `${bike.currentMileage} KM` : 'Low KM'}</span>
          <span className="inline-flex items-center gap-1.5"><Bike size={13} className="text-slate-400" />{categoryName || 'Vehicle'}</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-slate-400" />From {packageStart ? `${packageStart}h` : '1h'}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />Cox&apos;s Bazar</span>
          <span className="inline-flex items-center gap-1.5"><Shield size={13} className="text-slate-400" />Inspected</span>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-500">
            <MapPin size={13} /> Cox&apos;s Bazar
          </span>
          <p className="text-xl font-black text-red-600">{bike.pricePerHour} <span className="text-xs font-bold text-slate-500">TK/hr</span></p>
        </div>
        <Link href={`/bike/${bike._id}`}
          className="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-bold bg-neutral-900 hover:bg-black text-white transition-all">
          <Calendar size={15} /> Rent Now
        </Link>
      </div>
    </div>
  );
};

export default VehicleCard;
