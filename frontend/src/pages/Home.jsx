import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Search, MapPin, Clock, ArrowRight, Shield, CreditCard, Headphones, Zap, Bike, Car, Truck, ChevronRight, RefreshCw, Star, Heart, GitCompareArrows, Calendar } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CurrentSeasonalInfo } from '../components/SeasonalBadge';
import ZoneMap from '../components/ZoneMap';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import useSiteContent from '../hooks/useSiteContent';

const categoryIcons = { Bike, Car, Jeep: Truck };

const features = [
  { icon: Shield, title: 'Verified Vehicles', desc: 'Every vehicle is inspected and verified before listing' },
  { icon: CreditCard, title: 'Secure Payment', desc: 'Pay safely via SSLCommerz — bKash, Nagad, Card, Bank' },
  { icon: Headphones, title: '24/7 Support', desc: 'Reach us anytime at 01891-154443 or 01764-466757' },
  { icon: Zap, title: 'Instant Booking', desc: 'Book your ride in seconds with instant confirmation' },
];

const steps = [
  { num: '01', title: 'Browse', desc: 'Find the perfect bike, car or jeep', icon: Search },
  { num: '02', title: 'Book', desc: 'Select dates, apply coupon, pay advance', icon: Calendar },
  { num: '03', title: 'Ride', desc: "Pick up and explore Cox's Bazar", icon: Bike },
];

const Home = () => {
  const { get } = useSiteContent();
  const [bikes, setBikes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [zones, setZones] = useState([]);
  const [activeZone, setActiveZone] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [bikeRatings, setBikeRatings] = useState({});

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
    api.get('/zones/active').then(res => setZones(res.data)).catch(() => setZones([]));
  }, []);

  const fetchBikes = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeCategory) params.category = activeCategory;
      if (activeZone) params.zone = activeZone;
      const res = await api.get('/dashboard/bikes/available', { params });
      setBikes(res.data);
    } catch {
      setFetchError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeCategory, activeZone]);

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
    bikes.forEach(bike => {
      api.get(`/reviews/${bike._id}?limit=1`)
        .then(res => {
          if (res.data?.stats) {
            setBikeRatings(prev => ({ ...prev, [bike._id]: res.data.stats }));
          }
        })
        .catch(() => {});
    });
  }, [bikes]);

  const handleCategoryClick = (slug) => {
    setActiveCategory(prev => prev === slug ? '' : slug);
  };

  const categoryCounts = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      count: bikes.filter(b => b.category?.slug === cat.slug).length
    })),
    [categories, bikes]
  );

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

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      {fetchError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="border p-4 rounded-2xl text-sm text-center" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
            {fetchError} <button onClick={() => { setFetchError(''); setLoading(true); }} className="font-semibold underline ml-2" aria-label="Retry">Retry</button>
          </div>
        </div>
      )}
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden min-h-[500px] sm:min-h-[560px]">
        {/* Background Images */}
        {bikes.length > 0 && (
          <div className="absolute inset-0">
            {bikes.slice(0, 5).map((bike, i) => (
              <div key={bike._id} className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: heroSlide === i ? 1 : 0 }}>
                <img
                  src={bike.images?.[0] || ''}
                  alt={bike.model}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              </div>
            ))}
            {/* Fallback gradient if no images loaded */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0.8) 50%, rgba(139,92,246,0.1) 100%)' }} />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full glass text-xs font-medium mb-6" style={{ color: 'var(--pill-text)', borderColor: 'var(--pill-border)' }}>
              <MapPin size={12} className="mr-1.5" /> Cox's Bazar, Bangladesh
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-white">
              {get('home.hero.title', "Explore Cox's Bazar on")}{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{get('home.hero.highlight', 'Two Wheels')}</span>
            </h1>
            <p className="text-lg mb-8 max-w-lg leading-relaxed text-white/80">
              {get('home.hero.subtitle', "Rent bikes, cars & beach jeeps at the world's longest beach. Best prices, verified vehicles, secure online payment.")}
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center px-4 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Clock size={16} className="mr-2 text-amber-400" />
                Starting from 200 TK/hr
              </div>
              <div className="flex items-center px-4 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <MapPin size={16} className="mr-2 text-green-400" />
                {bikes.length} vehicles available
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#vehicles" className="btn-primary !px-8 !py-3.5 text-sm">
                Browse Vehicles
              </a>
              <Link to="/policies" className="btn-ghost !px-8 !py-3.5 text-sm !border-white/30 !text-white/90 hover:!bg-white/10">
                Learn More
              </Link>
            </div>
            <div className="mt-6">
              <CurrentSeasonalInfo />
            </div>
          </div>

          {/* Carousel Controls */}
          {bikes.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
              <button onClick={() => setHeroSlide(prev => prev === 0 ? Math.min(bikes.length, 5) - 1 : prev - 1)}
                className="w-9 h-9 glass rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all"
                aria-label="Previous slide">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex gap-2">
                {bikes.slice(0, 5).map((_, i) => (
                  <button key={i} onClick={() => setHeroSlide(i)}
                    className={`rounded-full transition-all ${heroSlide === i ? 'bg-amber-400 w-8 h-3' : 'bg-white/40 hover:bg-white/60 w-3 h-3'}`}
                    aria-label={`Go to slide ${i + 1}`} />
                ))}
              </div>
              <button onClick={() => setHeroSlide(prev => (prev + 1) % Math.min(bikes.length, 5))}
                className="w-9 h-9 glass rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all"
                aria-label="Next slide">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}

          {/* Featured Vehicle Label */}
          {bikes.length > 0 && bikes[heroSlide] && (
            <div className="absolute bottom-8 right-8 hidden lg:block z-20">
              <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
                <img src={bikes[heroSlide].images?.[0] || ''} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-medium text-white">{bikes[heroSlide].model}</p>
                  <p className="text-xs text-amber-400 font-bold">{bikes[heroSlide].pricePerHour} TK/hr</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm" style={{ border: '1px solid var(--border-strong)' }}>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{bikes.length}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Vehicles</span>
          </div>
          <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--divider)' }} />
          {categoryCounts.map(cat => (
            <div key={cat._id} className="flex items-center gap-2">
              <span className="text-xl font-black" style={{ color: 'var(--stat-number)' }}>{cat.count}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cat.name}{cat.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--divider)' }} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-white text-sm font-bold shadow-lg">
            From 200 TK/hr
          </div>
        </div>
      </section>

      {/* Category Cards */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categoryCounts.map(cat => {
              const Icon = categoryIcons[cat.name] || Bike;
              const isZero = cat.count === 0;
              return (
                <button
                  key={cat._id}
                  onClick={() => { if (isZero) return; handleCategoryClick(cat.slug); document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 text-left ${
                    isZero ? 'opacity-50 cursor-default' : activeCategory === cat.slug
                      ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : ''
                  } ${!isZero ? 'glass' : ''}`}
                  style={!isZero && activeCategory !== cat.slug ? { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' } : isZero ? { background: 'var(--input-bg)', border: '1px solid var(--border-base)' } : undefined}
                 aria-label={isZero ? `${cat.name} — coming soon` : "Filter by category"}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeCategory === cat.slug ? 'gradient-primary' : ''
                  }`}
                    style={activeCategory !== cat.slug ? { background: isZero ? 'transparent' : 'var(--hover-bg)' } : undefined}
                  >
                    <Icon size={22} className={activeCategory === cat.slug ? 'text-white' : ''} style={activeCategory !== cat.slug ? { color: isZero ? 'var(--text-muted)' : 'var(--text-muted)' } : undefined} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: isZero ? 'var(--text-muted)' : 'var(--card-title)' }}>{cat.name}s</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isZero ? 'Coming soon' : `${cat.count} available`}</p>
                  </div>
                  {!isZero && <ChevronRight size={16} className={`ml-auto ${activeCategory === cat.slug ? 'text-amber-400' : ''}`} style={activeCategory !== cat.slug ? { color: 'var(--text-muted)' } : undefined} />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Vehicle Grid */}
      <div style={{ background: 'var(--bg-section-alt)' }}>
      <section id="vehicles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="relative mb-6 max-w-lg">
          <div className="glass rounded-2xl p-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by model or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search vehicles by model or brand"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 border-0"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory('')}
              className={`px-5 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeCategory === ''
                  ? 'gradient-primary text-white shadow-lg shadow-amber-500/25'
                  : 'glass'
              }`}
              style={activeCategory !== '' ? { color: 'var(--text-secondary)' } : undefined}
             aria-label="Filter by category">
              All Vehicles
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`px-5 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.slug
                    ? 'gradient-primary text-white shadow-lg shadow-amber-500/25'
                    : 'glass'
                }`}
                style={activeCategory !== cat.slug ? { color: 'var(--text-secondary)' } : undefined}
               aria-label="Filter by category">
                {cat.name}s
              </button>
            ))}
          </div>
        )}

        {/* Zone Filter */}
        {zones.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveZone('')}
              className={`px-4 py-2 min-h-9 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeZone === ''
                  ? 'gradient-primary text-white shadow-lg shadow-amber-500/25'
                  : 'glass'
              }`}
              style={activeZone !== '' ? { color: 'var(--text-secondary)' } : undefined}
             aria-label="Filter by zone">
              All Zones
            </button>
            {zones.map(z => (
              <button
                key={z._id}
                onClick={() => setActiveZone(prev => prev === z._id ? '' : z._id)}
                className={`px-4 py-2 min-h-9 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeZone === z._id
                    ? 'gradient-primary text-white shadow-lg shadow-amber-500/25'
                    : 'glass'
                }`}
                style={activeZone !== z._id ? { color: 'var(--text-secondary)' } : undefined}
               aria-label="Filter by zone">
                <span className="w-2 h-2 rounded-full" style={{ background: z.color || '#f59e0b' }} />
                {z.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
            {slowNetwork && (
              <div className="text-center glass rounded-2xl p-6 max-w-md mx-auto">
                <RefreshCw size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Taking longer than usual?</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>The server may be slow to respond. You can wait or retry.</p>
                <button onClick={() => { setSlowNetwork(false); setLoading(true); fetchBikes(); }}
                  className="btn-primary !px-5 !py-2.5 text-sm" aria-label="Reload page">
                  Retry
                </button>
              </div>
            )}
          </div>
        ) : bikes.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search || activeCategory ? 'No vehicles match your search' : 'No vehicles available yet'}
            description={search || activeCategory ? 'Try adjusting your filters' : 'Check back soon for new listings'}
            action={(search || activeCategory) && (
              <button onClick={() => { setSearch(''); setActiveCategory(''); }} className="text-amber-400 hover:text-amber-300 text-sm font-medium min-h-11 px-4 py-2 rounded-lg transition-all" style={{ color: 'var(--accent-text)' }} aria-label="Filter by category">
                Clear filters
              </button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike, index) => {
              const rating = bikeRatings[bike._id];
              return (
              <Link
                key={bike._id}
                to={`/bike/${bike._id}`}
                className="glass rounded-2xl overflow-hidden card-hover group animate-slide-up block"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={bike.images?.[0] || 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'}
                    alt={bike.model}
                    width="400"
                    height="300"
                    className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { e.target.src = 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--badge-bg)', color: 'var(--pill-text)' }}>
                      {bike.category?.name || 'Vehicle'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(bike._id); }}
                      className="p-2 rounded-full bg-black/40 backdrop-blur-sm transition-all hover:scale-110"
                      aria-label={hasWish(bike._id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={14} fill={hasWish(bike._id) ? '#ef4444' : 'none'} color={hasWish(bike._id) ? '#ef4444' : 'white'} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(bike); }}
                      className={`p-2 rounded-full bg-black/40 backdrop-blur-sm transition-all hover:scale-110 ${hasCompare(bike._id) ? 'ring-2 ring-amber-400' : ''}`}
                      aria-label={hasCompare(bike._id) ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      <GitCompareArrows size={14} color={hasCompare(bike._id) ? '#f59e0b' : 'white'} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1 gradient-primary rounded-lg text-xs font-bold text-white shadow-lg">
                      {bike.pricePerHour} TK/hr
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-lg font-bold truncate transition-colors" style={{ color: 'var(--card-title)' }}>{bike.model}</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--card-sub)' }}>{bike.brand}</p>
                  <div className="flex items-center gap-1.5 mt-2 mb-3">
                    <div className="flex items-center">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={12} fill={rating && star <= Math.round(rating.average) ? '#f59e0b' : 'none'} color={rating && star <= Math.round(rating.average) ? '#f59e0b' : 'var(--text-muted)'} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {rating ? `${rating.average.toFixed(1)} (${rating.count})` : 'No reviews'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-full py-2.5 min-h-11 rounded-xl text-sm font-semibold transition-all mt-auto group-hover:border-amber-500/50 group-hover:text-amber-400"
                    style={{ border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}
                  >
                    View Details
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );})}
            {bikes.length < 3 && Array.from({ length: 3 - bikes.length }).map((_, i) => (
              <div key={`placeholder-${i}`} className="glass rounded-2xl overflow-hidden opacity-60 flex flex-col items-center justify-center p-8 text-center min-h-[380px]" style={{ border: '2px dashed var(--border-base)' }}>
                <Bike size={40} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mt-4" style={{ color: 'var(--text-secondary)' }}>More vehicles coming soon</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Check back later for new listings</p>
              </div>
            ))}
          </div>
        )}
      </section>

      </div>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--section-title)' }}>Why Choose Us</h2>
          <p style={{ color: 'var(--section-sub)' }} className="max-w-lg mx-auto">The best vehicle rental experience in Cox's Bazar</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 text-center card-hover animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/20 transition-transform duration-300 hover:scale-110">
                <f.icon size={32} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-base" style={{ color: 'var(--section-title)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--section-sub)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <div style={{ background: 'var(--bg-section-alt)' }}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--section-title)' }}>How It Works</h2>
          <p style={{ color: 'var(--section-sub)' }}>Three simple steps to your ride</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto relative">
          <div className="hidden sm:block absolute top-12 left-[calc(16.66%+40px)] right-[calc(16.66%+40px)] h-px" style={{ borderTop: '2px dashed rgba(245,158,11,0.3)' }} />
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
            <div key={i} className="text-center card-hover rounded-2xl p-6 relative">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                <Icon size={28} className="text-white" />
              </div>
              <div className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">{s.num}</div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--section-title)' }}>{s.title}</h3>
              <p className="text-sm" style={{ color: 'var(--section-sub)' }}>{s.desc}</p>
            </div>
          );})}
        </div>
      </section>

      </div>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--section-title)' }}>What Riders Say</h2>
          <p style={{ color: 'var(--section-sub)' }} className="max-w-lg mx-auto">Real experiences from our customers in Cox's Bazar</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {[
            {
              name: 'Rahim Uddin',
              role: 'Tourist from Dhaka',
              text: 'Rented a bike for 3 days. The booking process was super easy and the bike was in great condition. Highly recommend for exploring Cox\'s Bazar!',
              rating: 5,
              vehicle: 'TVS Scooty',
            },
            {
              name: 'Fatima Ahmed',
              role: 'Local Resident',
              text: 'Best rental service in Cox\'s Bazar. Affordable prices and the online payment was seamless. Will definitely use again.',
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
            <div key={i} className="glass rounded-2xl p-6 card-hover animate-slide-up flex flex-col" style={{ animationDelay: `${i * 0.1}s`, border: '1px solid var(--border-base)' }}>
              <div className="text-3xl leading-none mb-2" style={{ color: 'var(--accent-text)' }}>"</div>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} fill={s <= t.rating ? '#f59e0b' : 'none'} color={s <= t.rating ? '#f59e0b' : 'var(--text-muted)'} />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4 line-clamp-4" style={{ color: 'var(--text-secondary)' }}>"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 mt-auto" style={{ borderTop: '1px solid var(--border-base)' }}>
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/20">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.role} • {t.vehicle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Explore Zones */}
      <div style={{ background: 'var(--bg-section-alt)' }}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--section-title)' }}>
              <MapPin size={28} className="inline mr-2" style={{ color: 'var(--accent-text)' }} />
              Explore Zones
            </h2>
            <p className="text-sm" style={{ color: 'var(--section-sub)' }}>
              Discover rental zones across Cox's Bazar — from city center to St. Martin's Island
            </p>
          </div>
          <Link to="/zones" className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl transition-all" style={{ color: 'var(--accent-text)', border: '1px solid var(--accent-text)' }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="lg:row-span-2">
            <ZoneMap height="420px" />
          </div>

          {/* Zone Cards */}
          {zones.slice(0, 6).map((zone, i) => (
            <Link
              key={zone._id}
              to={`/search?zone=${zone.slug || zone._id}`}
              className="glass rounded-xl p-4 card-hover group flex items-center gap-4 animate-slide-up"
              style={{ animationDelay: `${i * 0.05}s`, border: '1px solid var(--border-base)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: (zone.color || '#f59e0b') + '20' }}>
                <MapPin size={18} style={{ color: zone.color || '#f59e0b' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{zone.name}</h3>
                {zone.description && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{zone.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {zone.bikeCount > 0 ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Bike size={10} /> {zone.bikeCount} vehicles
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No vehicles yet</span>
                  )}
                </div>
              </div>
              <ArrowRight size={16} className="flex-shrink-0 transition-opacity" style={{ color: 'var(--accent-text)' }} />
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link to="/zones" className="inline-flex items-center gap-1.5 text-sm font-medium px-6 py-3 rounded-xl transition-all" style={{ color: 'var(--accent-text)', border: '1px solid var(--accent-text)' }}>
            View All Zones <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
};

export default memo(Home);
