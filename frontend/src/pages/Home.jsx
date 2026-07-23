import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Search, MapPin, Clock, ArrowRight, Shield, CreditCard, Headphones, Zap, Bike, Car, Truck, ChevronRight } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const categoryIcons = { Bike, Car, Jeep: Truck };

const features = [
  { icon: Shield, title: 'Verified Vehicles', desc: 'Every vehicle is inspected and verified before listing' },
  { icon: CreditCard, title: 'Secure Payment', desc: 'Pay safely via SSLCommerz — bKash, Nagad, Card, Bank' },
  { icon: Headphones, title: '24/7 Support', desc: 'Reach us anytime at 01891-154443 or 01764-466757' },
  { icon: Zap, title: 'Instant Booking', desc: 'Book your ride in seconds with instant confirmation' },
];

const steps = [
  { num: '01', title: 'Browse', desc: 'Find the perfect bike, car or jeep' },
  { num: '02', title: 'Book', desc: 'Select dates, apply coupon, pay advance' },
  { num: '03', title: 'Ride', desc: 'Pick up and explore Cox\'s Bazar' },
];

const Home = () => {
  const [bikes, setBikes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/dashboard/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchBikes = async () => {
      setLoading(true);
      try {
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (activeCategory) params.category = activeCategory;
        const res = await api.get('/dashboard/bikes/available', { params });
        setBikes(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchBikes();
  }, [debouncedSearch, activeCategory]);

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

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] animate-float hidden sm:block" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '4s' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full glass text-xs font-medium mb-6" style={{ color: 'var(--pill-text)', borderColor: 'var(--pill-border)' }}>
              <MapPin size={12} className="mr-1.5" /> Cox's Bazar, Bangladesh
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6" style={{ color: 'var(--hero-text)' }}>
              Explore Cox's Bazar on{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Two Wheels</span>
            </h1>
            <p className="text-lg mb-8 max-w-lg leading-relaxed" style={{ color: 'var(--hero-sub)' }}>
              Rent bikes, cars & beach jeeps at the world's longest beach. Best prices, verified vehicles, secure online payment.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center px-4 py-2.5 rounded-xl glass text-sm" style={{ color: 'var(--pill-text)' }}>
                <Clock size={16} className="mr-2 text-cyan-400" />
                Starting from 200 TK/hr
              </div>
              <div className="flex items-center px-4 py-2.5 rounded-xl glass text-sm" style={{ color: 'var(--pill-text)' }}>
                <MapPin size={16} className="mr-2 text-green-400" />
                {bikes.length} vehicles available
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#vehicles" className="btn-primary !px-8 !py-3.5 text-sm">
                Browse Vehicles
              </a>
              <Link to="/policies" className="btn-ghost !px-8 !py-3.5 text-sm">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{bikes.length}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Vehicles</span>
          </div>
          <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--divider)' }} />
          {categoryCounts.map(cat => (
            <div key={cat._id} className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: 'var(--stat-number)' }}>{cat.count}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{cat.name}{cat.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--divider)' }} />
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-bold">From 200 TK/hr</span>
          </div>
        </div>
      </section>

      {/* Category Cards */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categoryCounts.map(cat => {
              const Icon = categoryIcons[cat.name] || Bike;
              return (
                <button
                  key={cat._id}
                  onClick={() => { handleCategoryClick(cat.slug); document.getElementById('vehicles')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`glass rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 text-left ${
                    activeCategory === cat.slug
                      ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                      : ''
                  }`}
                  style={activeCategory !== cat.slug ? { '--hover-bg': 'var(--hover-bg)' } : undefined}
                  onMouseEnter={e => { if (activeCategory !== cat.slug) e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={e => { if (activeCategory !== cat.slug) e.currentTarget.style.background = ''; }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeCategory === cat.slug ? 'gradient-primary' : ''
                  }`}
                    style={activeCategory !== cat.slug ? { background: 'var(--hover-bg)' } : undefined}
                  >
                    <Icon size={22} className={activeCategory === cat.slug ? 'text-white' : ''} style={activeCategory !== cat.slug ? { color: 'var(--text-muted)' } : undefined} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--card-title)' }}>{cat.name}s</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cat.count} available</p>
                  </div>
                  <ChevronRight size={16} className={`ml-auto ${activeCategory === cat.slug ? 'text-primary-400' : ''}`} style={activeCategory !== cat.slug ? { color: 'var(--text-muted)' } : undefined} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Vehicle Grid */}
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
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 border-0"
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
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeCategory === ''
                  ? 'gradient-primary text-white shadow-lg shadow-blue-500/25'
                  : 'glass'
              }`}
              style={activeCategory !== '' ? { color: 'var(--text-secondary)' } : undefined}
            >
              All Vehicles
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.slug
                    ? 'gradient-primary text-white shadow-lg shadow-blue-500/25'
                    : 'glass'
                }`}
                style={activeCategory !== cat.slug ? { color: 'var(--text-secondary)' } : undefined}
              >
                {cat.name}s
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : bikes.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search || activeCategory ? 'No vehicles match your search' : 'No vehicles available yet'}
            description={search || activeCategory ? 'Try adjusting your filters' : 'Check back soon for new listings'}
            action={(search || activeCategory) && (
              <button onClick={() => { setSearch(''); setActiveCategory(''); }} className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                Clear filters
              </button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike, index) => (
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
                    className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { e.target.src = 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--badge-bg)', color: 'var(--pill-text)' }}>
                      {bike.category?.name || 'Vehicle'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1 gradient-primary rounded-lg text-xs font-bold text-white shadow-lg">
                      {bike.pricePerHour} TK/hr
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold mb-1 group-hover:text-cyan-300 transition-colors" style={{ color: 'var(--card-title)' }}>{bike.model}</h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--card-sub)' }}>{bike.brand}</p>
                  <div className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold transition-all group-hover:border-primary-500/50 group-hover:text-primary-400"
                    style={{ border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}
                  >
                    View Details
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--section-title)' }}>Why Choose Us</h2>
          <p style={{ color: 'var(--section-sub)' }} className="max-w-lg mx-auto">The best vehicle rental experience in Cox's Bazar</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="glass rounded-2xl p-4 sm:p-6 text-center card-hover animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                <f.icon size={24} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--section-title)' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--section-sub)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t" style={{ borderColor: 'var(--divider)' }}>
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--section-title)' }}>How It Works</h2>
          <p style={{ color: 'var(--section-sub)' }}>Three simple steps to your ride</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-3">{s.num}</div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--section-title)' }}>{s.title}</h3>
              <p className="text-sm" style={{ color: 'var(--section-sub)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
