"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';

import api from '../api/axios';
import { normalizeFaqs } from '../lib/faqContent';
import { Search, MapPin, Clock, ArrowRight, Shield, CreditCard, Headphones, Zap, Bike, Car, Truck, RefreshCw, Star, Calendar, BadgeCheck, Users, ChevronDown, PlusCircle, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import VehicleCard from '../components/VehicleCard';
import ShowcaseImage from '../components/ShowcaseImage';
import SafeImage from '../components/SafeImage';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { NEWS } from '../data/homepage';
import { CurrentSeasonalInfo } from '../components/SeasonalBadge';
import { useAuth } from '../context/useAuth';
import useSiteContent from '../hooks/useSiteContent';
import dynamic from 'next/dynamic';
const ZoneTeaserMap = dynamic(() => import('../components/ZoneTeaserMap'), {
  ssr: false,
  loading: () => <div className="skeleton rounded-2xl" style={{ height: 380 }} />,
});
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
  { name: 'Laboni Beach', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=70&auto=format&fit=crop' },
  { name: 'Marine Drive', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=70&auto=format&fit=crop' },
  { name: 'Inani Beach', img: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=70&auto=format&fit=crop' },
  { name: 'Himchari', img: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&q=70&auto=format&fit=crop' },
  { name: 'Kolatoli', img: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=800&q=70&auto=format&fit=crop' },
  { name: 'Sea Beach', img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=70&auto=format&fit=crop' },
];

/** Storefront data prefetched by `app/page.tsx`; `null` means the prefetch failed
 *  and the view falls back to fetching on the client exactly as it used to. */
interface HomeProps {
  initialBikes?: BikeType[] | null;
  initialCategories?: BikeCategory[] | null;
  initialFaqs?: Faq[] | null;
  initialRatings?: Record<string, ReviewStats> | null;
}

const Home = ({ initialBikes = null, initialCategories = null, initialFaqs = null, initialRatings = null }: HomeProps = {}) => {
  const { get } = useSiteContent();
  const { user } = useAuth();
  const [bikes, setBikes] = useState<BikeType[]>(initialBikes ?? []);
  const [categories, setCategories] = useState<BikeCategory[]>(initialCategories ?? []);
  const [loading, setLoading] = useState(initialBikes === null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [slowNetwork, setSlowNetwork] = useState(false);
  // Start the carousel on a bike that actually has a photo (first paint matters).
  const [heroSlide, setHeroSlide] = useState(() => {
    const seed = initialBikes ?? [];
    const i = seed.findIndex(b => (b.images || []).length > 0);
    return i >= 0 ? i : 0;
  });
  const [bikeRatings, setBikeRatings] = useState<Record<string, ReviewStats>>(initialRatings ?? {});
  const [faqs, setFaqs] = useState<Faq[]>(initialFaqs ?? []);
  const [rentalPackages, setRentalPackages] = useState<{ name: string; price: number }[] | null>(null);

  // Rental packages are admin-priced in Settings; hide the section if unreachable.
  useEffect(() => {
    api.get('/dashboard/settings').then(res => {
      const pkgs = res.data?.packages;
      if (Array.isArray(pkgs) && pkgs.length > 0) setRentalPackages(pkgs.slice(0, 3));
    }).catch(() => {});
  }, []);
  const [openFaq, setOpenFaq] = useState(0);
  const [mapInView, setMapInView] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [heroLocation, setHeroLocation] = useState('');

  const router = useRouter();

  // The server render already answered these queries, so the first client effect
  // for each resource is skipped (no duplicate request, no skeleton flash). Later
  // runs — typing, a category click, Retry — are user-driven and still fetch.
  const seeded = useRef({
    bikes: initialBikes !== null,
    categories: initialCategories !== null,
    faqs: initialFaqs !== null,
    ratings: initialRatings !== null,
  });

  // localStorage does not exist during SSR; reading it in the initial state would
  // render a different value on the client and warn on hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroLocation(getSavedPickupLocation());
  }, []);

  // Leaflet is heavy: mount the map only once it scrolls near the viewport.
  useEffect(() => {
    const el = mapRef.current;
    if (!el || mapInView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof IntersectionObserver === 'undefined') { setMapInView(true); return; }
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setMapInView(true); obs.disconnect(); }
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mapInView]);

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
    if (seeded.current.categories) { seeded.current.categories = false; return; }
    api.get('/dashboard/categories').then(res => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (seeded.current.faqs) { seeded.current.faqs = false; return; }
    api.get('/faqs')
      .then(res => setFaqs(normalizeFaqs(res.data).faqs.slice(0, 6)))
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

  useEffect(() => {
    if (seeded.current.bikes) { seeded.current.bikes = false; return; }
    fetchBikes();
  }, [fetchBikes]);

  useEffect(() => {
    if (bikes.length === 0) return;
    const interval = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % Math.min(bikes.length, 5));
    }, 5000);
    return () => clearInterval(interval);
  }, [bikes.length]);

  useEffect(() => {
    if (bikes.length === 0) return;
    if (seeded.current.ratings) { seeded.current.ratings = false; return; }
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
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (activeCategory) params.set('category', activeCategory);
    if (heroLocation) params.set('zone', heroLocation);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
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
    // A showcase without a photo looks broken: prefer bikes that have images.
    const withPhotos = bikes.filter(b => (b.images || []).length > 0);
    const pool = withPhotos.length > 0 ? withPhotos : bikes;
    let best: BikeType | null = null;
    let bestScore = -1;
    pool.forEach(b => {
      const r = bikeRatings[b._id];
      if (r && (r.total || 0) > 0) {
        const score = (r.avgRating || 0) * 100 + Math.min(r.total ?? 0, 50);
        if (score > bestScore) { bestScore = score; best = b; }
      }
    });
    return best || pool[0] || null;
  }, [bikes, bikeRatings]);

  /** Map follows the category cards: only those bike IDs reach the live feed. */
  const mapBikeIds = useMemo(() => {
    if (!activeCategory) return undefined;
    return bikes
      .filter((b: BikeType) => (typeof b.category === 'string' ? undefined : b.category?.slug) === activeCategory)
      .map((b: BikeType) => b._id);
  }, [bikes, activeCategory]);

  /** Top 4 for the Featured row: rated first, verified fill the rest. */
  const featuredBikes = useMemo(() => {
    const scored = bikes.map(b => {
      const r = bikeRatings[b._id];
      const score = r && (r.total || 0) > 0 ? (r.avgRating || 0) * 100 + Math.min(r.total ?? 0, 50) : (b.isVerified ? 1 : 0);
      return { bike: b, score };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 4).map(s => s.bike);
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
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-200/50 blur-3xl" />
          <div className="absolute top-24 right-[-7rem] h-80 w-80 rounded-full bg-amber-100/80 blur-3xl" />
          <div className="absolute left-0 top-0 h-56 w-72"
            style={{
              backgroundImage: 'radial-gradient(#fdba74 1.3px, transparent 1.3px)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(to bottom right, black 30%, transparent 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom right, black 30%, transparent 75%)',
            }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 lg:pb-32 sm:pt-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600 mb-5">
                <Shield size={12} /> 100% Trusted rental platform in Cox&apos;s Bazar
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.08] mb-5">
                <span className="text-orange-500">{get('home.hero.title', 'Make Your Ride Easy With')}</span><br />
                <span className="text-slate-900">{get('home.hero.highlight', 'Rent Bike Cox\u2019s Bazar')}</span>
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
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center">
                  {['R', 'S', 'T', '+'].map((ch, i) => (
                    <span key={i} className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-black text-white shadow ${i > 0 ? '-ml-2.5' : ''} ${['bg-orange-500', 'bg-teal-700', 'bg-neutral-900', 'bg-amber-500'][i]}`} aria-hidden="true">{ch}</span>
                  ))}
                  <span className="ml-2.5 font-bold text-slate-900">Trusted riders</span>
                  <span className="text-slate-500 ml-1">across Cox&apos;s Bazar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-500" />
                  <span className="font-bold text-slate-900">{bikes.length}+ Vehicles</span>
                  <span className="text-slate-500">ready to ride</span>
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
                  <SafeImage key={heroBike._id} src={heroBike.images[0]} alt={heroBike.model ?? ''}
                    fill sizes="(max-width: 1024px) 100vw, 50vw" eager className="object-cover animate-fade-in" />
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

        {/* Search widget: overlaps the next section by a fixed half only on lg+,
            where the card is always one row tall. Below lg the card wraps to
            2+ rows, so a percentage overlap would swallow the heading. */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mb-2">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 p-4 sm:p-5 lg:translate-y-1/2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_auto] gap-3">
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
                  <Search size={16} /> Find Bike
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ POPULAR CATEGORIES ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-24 pb-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Popular Bike Categories</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Most popular worldwide categories due to their reliability, affordability, and features</p>
        </div>
        {categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {categoryCounts.map(cat => {
              const Icon = categoryIcons[cat.name ?? ''] || Bike;
              const isZero = cat.count === 0;
              const isActive = activeCategory === cat.slug;
              return (
                <button key={cat._id}
                  onClick={() => { if (isZero) return; handleCategoryClick(cat.slug ?? ''); document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' }); }}
                  disabled={isZero}
                  className={`rounded-2xl p-5 flex flex-col items-center gap-2 text-center border transition-all duration-300 ${isZero ? 'opacity-50 border-slate-200 bg-slate-50' : isActive ? 'border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-900/20' : 'border-slate-200 bg-white hover:border-slate-900 hover:shadow-lg'}`}
                  aria-label={isZero ? `${cat.name} — coming soon` : `Filter by ${cat.name}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                    <Icon size={24} className={isActive ? 'text-white' : 'text-slate-800'} />
                  </div>
                  <h3 className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-900'}`}>{cat.name}s</h3>
                  <p className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{isZero ? 'Coming soon' : `${cat.count} Vehicles`}</p>
                </button>
              );
            })}
          </div>
        )}
        <div className="text-center mt-8">
          <a href="#vehicles" className="inline-flex items-center gap-2 bg-neutral-900 text-white font-bold px-7 py-3 rounded-lg text-sm hover:bg-black transition-all">
            View all Categories <ArrowRight size={15} />
          </a>
        </div>
      </section>

      {/* ============ EXPLORE ON MAP ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Section-level boundary: a map crash (Leaflet/tiles) must never take down the whole homepage */}
        <PageErrorBoundary fallbackMessage="The map failed to load. The rest of the page works fine — try again below.">
        <div ref={mapRef} className="rounded-2xl overflow-hidden border border-slate-200">
          {!mapInView ? (
            <div className="skeleton h-[320px] sm:h-[380px]" aria-label="Loading map" />
          ) : user ? (
            <LiveFleetMap
              key={activeCategory || 'all'}
              height="380px"
              showRecenter={true}
              filterBikeIds={mapBikeIds}
            />
          ) : (
            <ZoneTeaserMap />
          )}
        </div>
        </PageErrorBoundary>
        {user && activeCategory && (
          <p className="text-center text-xs text-slate-500 mt-3">
            Showing {mapBikeIds?.length ?? 0} {activeCategory} on the map •
            <button onClick={() => handleCategoryClick(activeCategory)} className="ml-1 font-bold text-orange-600 hover:text-orange-500">Clear filter</button>
          </p>
        )}
      </section>

      {/* ============ FEATURED BIKES ============ */}
      {featuredBikes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Featured &amp; Top Rated Bikes</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">Here is a list of some of the most loved bikes globally, based on user votes and reviews</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBikes.map(bike => {
              const rating = bikeRatings[bike._id];
              const isTopRated = rating && (rating.avgRating || 0) >= 4.5 && (rating.total || 0) > 0;
              return (
                <VehicleCard key={bike._id} bike={bike} rating={rating} badge={isTopRated ? 'top' : bike.isVerified ? 'featured' : null} />
              );
            })}
          </div>
          <div className="text-center mt-8">
            <a href="#vehicles" className="inline-flex items-center gap-2 bg-neutral-900 text-white font-bold px-7 py-3 rounded-lg text-sm hover:bg-black transition-all">
              View All Bikes <ArrowRight size={15} />
            </a>
          </div>
        </section>
      )}

      {/* ============ HOW IT WORKS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">How It Works</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Renting a vehicle is a straightforward process that typically involves the following steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto relative">
          <div className="hidden sm:block absolute top-7 left-[18%] right-[18%] border-t-2 border-dashed border-slate-200" aria-hidden="true" />
          {steps.map((s, i) => {
            const Icon = s.icon;
            const dots = ['bg-teal-700', 'bg-neutral-900', 'bg-orange-500'];
            return (
              <div key={i} className="text-center px-4 relative">
                <div className={`w-14 h-14 rounded-full ${dots[i % 3]} flex items-center justify-center mx-auto mb-1 shadow-lg relative z-10 ring-4 ring-white`}>
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
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Most Popular Bikes</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">Here is a list of some of the most loved bikes globally, based on user votes and reviews</p>
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
                return (
                  <VehicleCard key={bike._id} bike={bike} rating={rating} badge={isTopRated ? 'top' : isFeatured ? 'featured' : null} />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <div className="bg-[#0d0d12] py-4 overflow-hidden" aria-hidden="true">
        <div className="flex whitespace-nowrap animate-marquee w-max">
          {[0, 1].map(copy => (
            <div key={copy} className="flex shrink-0 items-center">
              {['Free Cancellation', 'Trust & Security', 'Verified Fleet', 'Latest Bikes', '24/7 Support', 'Best Rate in Cox\u2019s Bazar'].map(item => (
                <span key={`${copy}-${item}`} className="mx-6 text-sm font-bold text-white flex items-center gap-6">
                  {item} <span className="text-orange-500">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

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
                <ShowcaseImage images={topRatedBike.images} model={topRatedBike.model} />
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
      <section className="relative overflow-hidden bg-[#0d0d12] py-16 sm:py-20">
        <div className="pointer-events-none absolute -left-24 top-0 h-full w-72 opacity-80" aria-hidden="true"
          style={{ background: 'linear-gradient(115deg, #f97316 0%, #fb923c 40%, transparent 41%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-3">Why choose us</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Why People Love To Use Rent Bike</h2>
              <p className="text-slate-400 text-sm max-w-lg mb-8">We are committed to the best rental experience in Cox&apos;s Bazar — verified vehicles, honest pricing, support that answers.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-3.5">
                    <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center shrink-0 shadow-lg`}>
                      <f.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-[15px] mb-1">{f.title}</h3>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="absolute inset-8 rounded-[2rem] bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 rotate-2" aria-hidden="true" />
              <div className="relative rounded-[2rem] overflow-hidden border-8 border-white/10 shadow-2xl bg-slate-800 -rotate-1 h-[360px]">
                <Image src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&q=80&auto=format&fit=crop" alt="Rental motorbike"
                  fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="absolute -bottom-5 right-8 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <Shield size={20} className="text-teal-700" />
                <div>
                  <p className="text-sm font-black text-slate-900">100% Verified</p>
                  <p className="text-xs text-slate-500">Inspected fleet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DESTINATIONS ============ */}
      <section className="bg-[#f4f6fa] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Featured Destinations</h2>
            <p className="text-slate-500 text-sm">Ride to the most loved spots along the world&apos;s longest beach</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {hotspots.map((spot, i) => {
              const img = spot.img;
              const isLead = i === 0;
              return (
                <Link key={spot.name} href="/search"
                  className={`relative rounded-xl overflow-hidden group border border-slate-200 bg-slate-200 block ${isLead ? 'col-span-2 row-span-2 min-h-[280px] lg:min-h-[368px]' : 'h-44 lg:h-[176px]'}`}>
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
              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                {[
                  { value: `${bikes.length}+`, label: 'Vehicles' },
                  { value: `${brands.length}+`, label: 'Brands' },
                  { value: `${hotspots.length}`, label: 'Pickup Spots' },
                  { value: minPrice > 0 ? `${minPrice}TK` : '—', label: 'Starting/hr' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
                    <p className="text-lg font-black text-white">{s.value}</p>
                    <p className="text-[11px] text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
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

      {/* ============ PRICING ============ */}
      {rentalPackages && rentalPackages.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Rental Packages, Honest Prices</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">Longer rides cost less per day — same verified fleet, same free cancellation</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {rentalPackages.map((pkg, i) => {
              const isPopular = i === 1 && rentalPackages.length === 3;
              return (
                <div key={pkg.name} className={`relative rounded-2xl border p-7 flex flex-col ${isPopular ? 'border-orange-500 bg-neutral-900 text-white shadow-xl shadow-orange-500/20 sm:-my-3 sm:py-10' : 'border-slate-200 bg-white'}`}>
                  {isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-orange-500 text-white shadow">
                      Most Popular
                    </span>
                  )}
                  <h3 className={`font-black text-lg mb-1 ${isPopular ? 'text-white' : 'text-slate-900'}`}>{pkg.name}</h3>
                  <p className="mb-5"><span className={`text-4xl font-black ${isPopular ? 'text-white' : 'text-slate-900'}`}>{pkg.price.toLocaleString()}</span> <span className={`text-sm font-bold ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>TK</span></p>
                  <ul className={`space-y-2.5 text-[13px] mb-7 ${isPopular ? 'text-slate-200' : 'text-slate-600'}`}>
                    <li className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal-500 shrink-0" /> {pkg.name} full-duration rental</li>
                    <li className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal-500 shrink-0" /> Free cancellation (24h+ notice)</li>
                    <li className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal-500 shrink-0" /> Verified inspected vehicle</li>
                    <li className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal-500 shrink-0" /> 24/7 roadside support</li>
                  </ul>
                  <Link href="/search" className={`mt-auto inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-bold transition-all ${isPopular ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-neutral-900 hover:bg-black text-white'}`}>
                    Choose Plan
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {/* ============ NEWS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Riding Notes &amp; Tips</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Short guides for getting the most out of Cox&apos;s Bazar on two wheels</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {NEWS.map(item => (
            <Link key={item.title} href={item.href} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow">{item.date}</span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-black text-slate-900 leading-snug mb-2 group-hover:text-orange-600 transition-colors">{item.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{item.excerpt}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-orange-600">
                  Read Guide <ArrowRight size={14} /> <span className="font-semibold text-slate-400">• {item.readTime}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
};

export default memo(Home);
