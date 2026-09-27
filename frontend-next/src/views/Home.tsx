"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';

import api from '../api/axios';
import { Search, MapPin, Clock, ArrowRight, Shield, CreditCard, Headphones, Zap, Bike, Car, Truck, RefreshCw, Star, Heart, GitCompareArrows, Calendar, Navigation, BadgeCheck, Gauge, Users, ChevronDown, PlusCircle, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CurrentSeasonalInfo } from '../components/SeasonalBadge';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import useSiteContent from '../hooks/useSiteContent';
import dynamic from 'next/dynamic';
const LiveFleetMap = dynamic(() => import('../components/LiveFleetMap'), {
  ssr: false,
  loading: () => <div className="skeleton rounded-2xl" style={{ height: 400 }} />,
});
import type { Bike as BikeType, BikeCategory, Faq, ReviewStats } from '@/types';
import { PICKUP_SPOTS, getSavedPickupLocation, savePickupLocation, clearPickupLocation } from '../lib/pickupSpots';

const categoryIcons: Record<string, LucideIcon> = { Bike, Car, Jeep: Truck };

const features = [
  { icon: Shield, title: 'Verified Vehicles', desc: 'Every vehicle is inspected and verified before listing', bg: 'bg-neutral-900' },
  { icon: CreditCard, title: 'Secure Payment', desc: 'Pay safely via SSLCommerz — bKash, Nagad, Card, Bank', bg: 'bg-teal-700' },
  { icon: Headphones, title: '24/7 Support', desc: 'Reach us anytime at 01891-154443 or 01764-466757', bg: 'bg-orange-500' },
  { icon: Zap, title: 'Instant Booking', desc: 'Book your ride in seconds with instant confirmation', bg: 'bg-neutral-900' },
];

const steps = [
  { num: '01', title: 'Choose Date & Location', desc: 'Pick your travel dates and pickup spot anywhere in Cox\u2019s Bazar', icon: Calendar },
  { num: '02', title: 'Pick Your Vehicle', desc: 'Check availability, compare prices and choose your ride', icon: Search },
  { num: '03', title: 'Book & Ride', desc: 'Confirm booking, pay advance securely and enjoy your ride', icon: Bike },
];

const hotspots = [
  { name: 'Laboni Beach' },
  { name: 'Marine Drive' },
  { name: 'Inani Beach' },
  { name: 'Himchari' },
  { name: 'Kolatoli' },
  { name: 'Sea Beach' },
];

const Home = () => {
  const { get } = useSiteContent();
  const [bikes, setBikes] = useState<BikeType[]>([]);
  const [categories, setCategories] = useState<BikeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [bikeRatings, setBikeRatings] = useState<Record<string, ReviewStats>>({});
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openFaq, setOpenFaq] = useState(0);
  const [heroLocation, setHeroLocation] = useState(() => getSavedPickupLocation());

  const { toggle: toggleCompare, has: hasCompare } = useCompare();
  const { toggle: toggleWishlist, has: hasWish } = useWishlist();

  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => setSlowNetwork(false), 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => setSlowNetwork(true), 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/dashboard/categories').then(res => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.get('/faqs')
      .then(res => {
        if (res.data && res.data.faqs) {
          const all = (Object.values(res.data.faqs) as Faq[][]).flat();
          setFaqs(all.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  const fetchBikes = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeCategory) params.category = activeCategory;
      const res = await api.get('/dashboard/bikes/available', { params });
      setBikes(res.data);
    } catch {
      setFetchError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeCategory]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBikes(); }, [fetchBikes]);

  useEffect(() => {
    if (bikes.length === 0) return;
    const interval = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % Math.min(bikes.length, 5));
    }, 5000);
    return () => clearInterval(interval);
  }, [bikes.length]);

  useEffect(() => {
    if (bikes.length === 0) return;
    const ids = bikes.map((b: BikeType) => b._id).join(',');
    api.get(`/reviews/stats?bikeIds=${encodeURIComponent(ids)}`)
      .then(res => {
        if (res.data && typeof res.data === 'object') {
          setBikeRatings(res.data);
        }
      })
      .catch(() => {});
  }, [bikes]);

  const handleCategoryClick = (slug: string): void => {
    setActiveCategory(prev => prev === slug ? '' : slug);
  };

  const handleHeroSearch = () => {
    savePickupLocation(heroLocation);
    document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearLocation = () => {
    setHeroLocation('');
    clearPickupLocation();
  };

  const categoryCounts = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      count: bikes.filter((b: BikeType) => (typeof b.category === 'string' ? undefined : b.category?.slug) === cat.slug).length
    })),
    [categories, bikes]
  );

  const brands = useMemo(() => {
    const counts: Record<string, number> = {};
    bikes.forEach(b => {
      if (b.brand) counts[b.brand] = (counts[b.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [bikes]);

  const minPrice = useMemo(() => {
    const prices = bikes.map(b => Number(b.pricePerHour) || 0).filter(p => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [bikes]);

  const topRatedBike = useMemo(() => {
    let best: BikeType | null = null;
    let bestScore = -1;
    bikes.forEach(b => {
      const r = bikeRatings[b._id];
      if (r && (r.total || 0) > 0) {
        const score = (r.avgRating || 0) * 100 + Math.min(r.total ?? 0, 50);
        if (score > bestScore) { bestScore = score; best = b; }
      }
    });
    return best || bikes[0] || null;
  }, [bikes, bikeRatings]);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Rent Bike Cox's Bazar",
    "url": "https://rent-bike-cox.vercel.app",
    "description": "Bike, car, and jeep rental in Cox's Bazar, Bangladesh",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Cox's Bazar",
      "addressCountry": "BD"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+880-189154443",
      "contactType": "customer service"
    }
  };

  const heroBike = bikes.length > 0 ? bikes[heroSlide % bikes.length] : null;

  return (
    <div className="bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      {fetchError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="border border-red-200 bg-red-50 p-4 rounded-2xl text-sm text-center text-red-700">
            {fetchError} <button onClick={() => { setFetchError(''); setLoading(true); }} className="font-semibold underline ml-2" aria-label="Retry">Retry</button>
          </div>
        </div>
      )}

      {/* ============ HERO ============ */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 top-0 h-full w-72 opacity-90"
            style={{ background: 'linear-gradient(115deg, #f97316 0%, #fb923c 45%, transparent 46%)' }} />
          <div className="absolute -left-10 top-10 h-full w-40 opacity-60"
            style={{ background: 'linear-gradient(115deg, transparent 55%, #fed7aa 56%, transparent 70%)' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-28 sm:pt-20 sm:pb-32 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600 mb-5">
                <Shield size={12} /> 100% Trusted rental platform in Cox&apos;s Bazar
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.08] mb-5">
                <span className="text-orange-500">{get('home.hero.title', 'Find Your Best')}</span><br />
                <span className="text-slate-900">{get('home.hero.highlight', 'Bike, Car & Jeep For Rental')}</span>
              </h1>
              <p className="text-slate-500 text-base sm:text-lg mb-7 max-w-lg leading-relaxed">
                {get('home.hero.subtitle', 'Experience comfort and freedom on the world\u2019s longest beach. Verified bikes, cars & beach jeeps with transparent hourly pricing.')}
              </p>
              <div className="flex flex-wrap gap-3 mb-7">
                <a href="#vehicles" className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-bold px-7 py-3.5 rounded-lg text-sm transition-all">
                  View all Vehicles <ArrowRight size={16} />
                </a>
                <Link href="/policies" className="inline-flex items-center gap-2 border-2 border-slate-200 hover:border-slate-900 text-slate-900 font-bold px-7 py-3.5 rounded-lg text-sm transition-all">
                  Learn More
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-500" />
                  <span className="font-bold text-slate-900">{bikes.length}+ Vehicles</span>
                  <span className="text-slate-500">ready to ride</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-orange-500" />
                  <span className="font-bold text-slate-900">From 200 TK/hr</span>
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <CurrentSeasonalInfo />
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 rotate-3" aria-hidden="true" />
              <div className="relative rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-100 -rotate-1 h-[380px]">
                {heroBike?.images?.[0] ? (
                  <Image key={heroBike._id} src={heroBike.images[0]} alt={heroBike.model ?? ''}
                    fill sizes="(max-width: 1024px) 100vw, 50vw" priority className="object-cover animate-fade-in"
                    onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = 'https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image'; }} />
                ) : (
                  <div className="w-full h-[380px] flex items-center justify-center">
                    <Bike size={72} className="text-slate-300" />
                  </div>
                )}
              </div>
              {heroBike && (
                <div className="absolute -bottom-5 left-8 bg-white rounded-xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{heroBike.model}</p>
                    <p className="text-xs text-slate-500">{heroBike.brand}</p>
                  </div>
                  <p className="text-lg font-black text-red-600">{heroBike.pricePerHour} <span className="text-xs font-semibold">TK/hr</span></p>
                </div>
              )}
              {bikes.length > 1 && (
                <div className="absolute -bottom-4 right-8 flex gap-1.5">
                  {bikes.slice(0, 5).map((_, i) => (
                    <button key={i} onClick={() => setHeroSlide(i)}
                      className={`rounded-full transition-all ${heroSlide % bikes.length === i ? 'bg-orange-500 w-6 h-2' : 'bg-slate-300 hover:bg-slate-400 w-2 h-2'}`}
                      aria-label={`Go to slide ${i + 1}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search widget overlapping */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mb-2">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 p-4 sm:p-5 translate-y-1/2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-3">
              <div>
                <label htmlFor="hero-location" className="block text-xs font-bold text-slate-900 mb-1.5">Pickup Location</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select id="hero-location" value={heroLocation} onChange={(e) => setHeroLocation(e.target.value)}
                    aria-label="Pickup location"
                    className="w-full pl-10 pr-3 py-3 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 appearance-none">
                    <option value="">Anywhere in Cox&apos;s Bazar</option>
                    {PICKUP_SPOTS.map(spot => (
                      <option key={spot} value={spot}>{spot}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hero-category" className="block text-xs font-bold text-slate-900 mb-1.5">Vehicle Type</label>
                <div className="relative">
                  <Bike size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select id="hero-category" value={activeCategory} onChange={(e) => handleCategoryClick(e.target.value)}
                    aria-label="Vehicle type"
                    className="w-full pl-10 pr-3 py-3 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 appearance-none">
                    <option value="">Any Type</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.slug}>{cat.name}s</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hero-model" className="block text-xs font-bold text-slate-900 mb-1.5">Model</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="hero-model" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search model or brand" aria-label="Search model or brand"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleHeroSearch(); }}
                    className="w-full pl-10 pr-3 py-3 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
                </div>
              </div>
              <div className="flex items-end">
                <button onClick={handleHeroSearch}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg text-sm transition-all shadow-lg shadow-orange-500/30">
                  <Search size={16} /> Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">How It Works</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Renting a vehicle is a straightforward process that typically involves the following steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const dots = ['bg-teal-700', 'bg-neutral-900', 'bg-orange-500'];
            return (
              <div key={i} className="text-center px-4">
                <div className={`w-14 h-14 rounded-full ${dots[i % 3]} flex items-center justify-center mx-auto mb-1 shadow-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div className="text-4xl font-black text-slate-200 -mt-1 mb-1">{s.num}</div>
                <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ VEHICLE GRID ============ */}
      <section id="vehicles" className="bg-[#f4f6fa] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Explore Most Popular Vehicles</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">Here&apos;s a list of the most loved rides in Cox&apos;s Bazar, based on our riders&apos; preferences</p>
            {heroLocation && (
              <button onClick={handleClearLocation}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 border border-orange-300 text-xs font-bold text-orange-700 hover:bg-orange-200 transition-all"
                aria-label={`Clear pickup location ${heroLocation}`}>
                <MapPin size={12} /> Pickup: {heroLocation} <span aria-hidden="true">×</span>
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-8">
            <div className="relative flex-1 max-w-md">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by model or brand..." value={search} onChange={(e) => setSearch(e.target.value)}
                aria-label="Search vehicles by model or brand"
                className="w-full pl-11 pr-4 py-3 rounded-lg text-sm bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveCategory('')}
                  className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeCategory === '' ? 'bg-neutral-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-900'}`}>
                  All
                </button>
                {categories.map(cat => (
                  <button key={cat._id} onClick={() => handleCategoryClick(cat.slug ?? '')}
                    className={`px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeCategory === cat.slug ? 'bg-neutral-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-900'}`}>
                    {cat.name}s
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
              {slowNetwork && (
                <div className="text-center bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto">
                  <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-slate-400" />
                  <p className="text-sm font-bold text-slate-900 mb-1">Taking longer than usual?</p>
                  <p className="text-xs text-slate-500 mb-3">The server may be slow to respond. You can wait or retry.</p>
                  <button onClick={() => { setSlowNetwork(false); setLoading(true); fetchBikes(); }}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm" aria-label="Reload page">
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : bikes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10">
              <EmptyState
                icon={Search}
                title={search || activeCategory ? 'No vehicles match your search' : 'No vehicles available yet'}
                description={search || activeCategory ? 'Try adjusting your filters' : 'Check back soon for new listings'}
                action={(search || activeCategory) && (
                  <button onClick={() => { setSearch(''); setActiveCategory(''); }} className="text-orange-600 hover:text-orange-500 text-sm font-bold px-4 py-2" aria-label="Clear filters">
                    Clear filters
                  </button>
                )}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bikes.map((bike, index) => {
                const rating = bikeRatings[bike._id];
                const isTopRated = rating && (rating.avgRating || 0) >= 4.5 && (rating.total || 0) > 0;
                const isFeatured = !isTopRated && bike.isVerified && index < 2;
                const conditionLabel = bike.condition ? bike.condition.charAt(0).toUpperCase() + bike.condition.slice(1) : 'Good';
                const packageStart = bike.packages?.[0]?.minHours;
                return (
                  <div key={bike._id} className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
                    <div className="relative overflow-hidden group">
                      <Link href={`/bike/${bike._id}`} aria-label={`View ${bike.model}`}>
                        <Image src={bike.images?.[0] || 'https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image'} alt={bike.model ?? ''}
                          width={400} height={300}
                          className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image'; }} />
                      </Link>
                      {(isFeatured || isTopRated) && (
                        <div className="absolute top-5 -left-10 rotate-[-35deg] px-10 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-md"
                          style={{ background: isFeatured ? '#dc2626' : '#f97316' }}>
                          {isFeatured ? 'Featured' : 'Top Rated'}
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
                      {(typeof bike.category === 'string' ? undefined : bike.category?.name) && (
                        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow">
                          {(typeof bike.category === 'string' ? undefined : bike.category?.name)}
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
                        <span className="inline-flex items-center gap-1.5"><Bike size={13} className="text-slate-400" />{(typeof bike.category === 'string' ? undefined : bike.category?.name) || 'Vehicle'}</span>
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
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Most Popular Categories</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Choose from bikes, cars and beach jeeps — every category thoroughly inspected</p>
        </div>
        {categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {categoryCounts.map(cat => {
              const Icon = categoryIcons[cat.name ?? ''] || Bike;
              const isZero = cat.count === 0;
              return (
                <button key={cat._id}
                  onClick={() => { if (isZero) return; handleCategoryClick(cat.slug ?? ''); document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' }); }}
                  disabled={isZero}
                  className={`rounded-2xl p-6 flex flex-col items-center gap-2 text-center border transition-all duration-300 ${isZero ? 'opacity-50 border-slate-200 bg-slate-50' : activeCategory === cat.slug ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/10' : 'border-slate-200 bg-white hover:border-slate-900 hover:shadow-lg'}`}
                  aria-label={isZero ? `${cat.name} — coming soon` : `Filter by ${cat.name}`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${activeCategory === cat.slug ? 'bg-orange-500' : 'bg-slate-100'}`}>
                    <Icon size={26} className={activeCategory === cat.slug ? 'text-white' : 'text-slate-800'} />
                  </div>
                  <h3 className="font-black text-slate-900">{cat.name}s</h3>
                  <p className="text-xs text-slate-500">{isZero ? 'Coming soon' : `${cat.count} Vehicles`}</p>
                </button>
              );
            })}
          </div>
        )}
        <div className="text-center mt-8">
          <a href="#vehicles" className="inline-flex items-center gap-2 border-2 border-slate-900 text-slate-900 font-bold px-7 py-3 rounded-lg text-sm hover:bg-slate-900 hover:text-white transition-all">
            View all Vehicles <ArrowRight size={15} />
          </a>
        </div>
      </section>

      {/* ============ FACTS BAND ============ */}
      <section className="relative overflow-hidden bg-[#0d0d12] py-16">
        <div className="pointer-events-none absolute -right-20 top-0 h-full w-72 opacity-90" aria-hidden="true"
          style={{ background: 'linear-gradient(245deg, #f97316 0%, #fb923c 40%, transparent 41%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Facts By The Numbers</h2>
            <p className="text-slate-400 text-sm">Real numbers from our live fleet in Cox&apos;s Bazar</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Bike, value: `${bikes.length}+`, label: 'Vehicles in Fleet' },
              { icon: Users, value: `${brands.length}+`, label: 'Trusted Brands' },
              { icon: MapPin, value: `${hotspots.length}`, label: 'Pickup Spots' },
              { icon: Clock, value: minPrice > 0 ? `${minPrice}+` : '—', label: 'TK/hr Starting Price' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 text-center">
                <s.icon size={26} className="mx-auto mb-3 text-orange-500" />
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HIGHLY RECOMMENDED ============ */}
      {topRatedBike && (
        <section className="bg-[#f4f6fa] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Highly Recommended</h2>
              <p className="text-slate-500 text-sm">Our riders&apos; top-rated pick right now</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto">
              <div className="relative min-h-[280px]">
                <Image src={topRatedBike.images?.[0] || 'https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image'} alt={topRatedBike.model ?? ''}
                  fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image'; }} />
                <span className="absolute top-4 left-4 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wide bg-orange-500 text-white shadow">Top Rated</span>
              </div>
              <div className="p-8 sm:p-10 flex flex-col justify-center">
                {(() => {
                  const r = bikeRatings[topRatedBike?._id ?? ''];
                  return (
                    <>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={15} fill={r && star <= Math.round(r.avgRating || 0) ? '#f59e0b' : 'none'} color={r && star <= Math.round(r.avgRating || 0) ? '#f59e0b' : '#cbd5e1'} />
                          ))}
                        </div>
                        <span className="text-sm text-slate-500">{r ? `${(r.avgRating || 0).toFixed(1)} (${r.total || 0} Reviews)` : 'New listing'}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">{topRatedBike.model}</h3>
                      <p className="text-slate-500 mb-5">{topRatedBike.brand} • {(typeof topRatedBike.category === 'string' ? undefined : topRatedBike.category?.name) || 'Vehicle'}</p>
                      <p className="text-3xl font-black text-red-600 mb-6">{topRatedBike.pricePerHour} <span className="text-sm font-bold text-slate-500">TK/hr</span></p>
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/bike/${topRatedBike._id}`} className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-bold px-7 py-3 rounded-lg text-sm transition-all">
                          <Calendar size={15} /> Rent Now
                        </Link>
                        <Link href={`/bike/${topRatedBike._id}`} className="inline-flex items-center gap-2 border-2 border-slate-200 hover:border-slate-900 text-slate-900 font-bold px-7 py-3 rounded-lg text-sm transition-all">
                          View Details
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ WHY CHOOSE US ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Why Choose Us</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">We are committed to the best rental experience in Cox&apos;s Bazar</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="text-center px-4">
              <div className={`w-16 h-16 rounded-2xl ${f.bg} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <f.icon size={28} className="text-white" />
              </div>
              <h3 className="font-black text-slate-900 mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ DESTINATIONS ============ */}
      <section className="bg-[#f4f6fa] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Featured Destinations</h2>
            <p className="text-slate-500 text-sm">Ride to the most loved spots along the world&apos;s longest beach</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {hotspots.map((spot, i) => {
              const img = bikes[i % Math.max(bikes.length, 1)]?.images?.[0];
              return (
                <Link key={spot.name} href="/search"
                  className="relative rounded-xl overflow-hidden h-44 group border border-slate-200 bg-slate-200 block">
                  {img ? (
                    <Image src={img} alt={spot.name}
                      fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-black text-white text-sm flex items-center gap-1.5">
                      <MapPin size={13} className="text-orange-400" /> {spot.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ BRANDS ============ */}
      {brands.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Bikes From Popular Brands</h2>
            <p className="text-slate-500 text-sm">Top manufacturers in our fleet</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {brands.map(brand => (
              <button key={brand.name}
                onClick={() => { setSearch(brand.name); setActiveCategory(''); document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-6 py-3 rounded-full border-2 border-slate-200 bg-white font-black text-sm text-slate-800 hover:border-orange-500 hover:text-orange-600 transition-all"
                aria-label={`Filter by brand ${brand.name}`}>
                {brand.name} <span className="font-semibold text-slate-400">({brand.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============ FAQ ============ */}
      {faqs.length > 0 && (
        <section className="bg-[#f4f6fa] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Frequently Asked Questions</h2>
              <p className="text-slate-500 text-sm mb-8">Find answers from our previous riders</p>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={faq._id} className={`bg-white rounded-xl border overflow-hidden transition-all ${openFaq === i ? 'border-orange-300 shadow-md' : 'border-slate-200'}`}>
                    <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={openFaq === i}>
                      <span className="font-bold text-sm text-slate-900">{faq.question}</span>
                      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${openFaq === i ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <ChevronDown size={15} className={`transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p className="text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-500">
                  View all FAQs <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-8 text-center lg:sticky lg:top-24">
              <Phone size={30} className="mx-auto mb-4 text-orange-500" />
              <h3 className="text-xl font-black text-white mb-2">Still Have Questions?</h3>
              <p className="text-sm text-slate-400 mb-6">Our team replies within minutes, 7 days a week.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-7 py-3 rounded-lg text-sm transition-all w-full justify-center">
                Contact Us <ArrowRight size={15} />
              </Link>
              <p className="text-slate-400 text-sm mt-4 font-bold">01891-154443</p>
            </div>
          </div>
        </section>
      )}

      {/* ============ CTA BAND ============ */}
      <section className="relative overflow-hidden bg-[#0d0d12] py-14">
        <div className="pointer-events-none absolute -left-20 top-0 h-full w-72 opacity-90" aria-hidden="true"
          style={{ background: 'linear-gradient(115deg, #f97316 0%, #fb923c 40%, transparent 41%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Want To Add Your Vehicle For Rent?</h2>
            <p className="text-slate-400 mt-1.5 text-sm max-w-lg">List your bike, car or jeep and start earning with Rent Bike Cox&apos;s Bazar.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-lg text-sm transition-all shadow-lg shadow-orange-500/30">
              <PlusCircle size={16} /> Add Your Listing
            </Link>
            <a href="tel:01891154443" className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white text-white font-bold px-8 py-3.5 rounded-lg text-sm transition-all">
              <Phone size={16} /> 01891-154443
            </a>
          </div>
        </div>
      </section>

      {/* ============ LIVE FLEET ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Live Fleet</h2>
            <p className="text-sm mt-1 text-slate-500">Track our available vehicles in real-time</p>
          </div>
          <span className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Navigation size={19} className="text-orange-600" />
          </span>
        </div>
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <LiveFleetMap height="400px" showRecenter={true} />
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative overflow-hidden bg-[#0d0d12] py-16">
        <div className="pointer-events-none absolute -right-20 top-0 h-full w-72 opacity-90" aria-hidden="true"
          style={{ background: 'linear-gradient(245deg, #f97316 0%, #fb923c 40%, transparent 41%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">What Riders Say About Us?</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">Discover what our customers think about us</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Rahim Uddin',
                role: 'Tourist from Dhaka',
                text: 'Rented a bike for 3 days. The booking process was super easy and the bike was in great condition. Highly recommend for exploring Cox\u2019s Bazar!',
                rating: 5,
                vehicle: 'TVS Scooty',
              },
              {
                name: 'Fatima Ahmed',
                role: 'Local Resident',
                text: 'Best rental service in Cox\u2019s Bazar. Affordable prices and the online payment was seamless. Will definitely use again.',
                rating: 5,
                vehicle: 'Honda CB Shine',
              },
              {
                name: 'Kamal Hossain',
                role: 'Adventure Seeker',
                text: 'Took a jeep to Himchari. Amazing experience! The vehicle was well-maintained and the pickup was right on time.',
                rating: 4,
                vehicle: 'Mahindra Thar',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={14} fill={s <= t.rating ? '#f59e0b' : 'none'} color={s <= t.rating ? '#f59e0b' : '#cbd5e1'} />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 mt-auto border-t border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center text-white text-sm font-black">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} • {t.vehicle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default memo(Home);
