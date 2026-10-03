"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import type { Bike, BikeCategory, PriceRange, ReviewStats, SearchFilterState, Suggestion } from '@/types';
import SearchFilters from '../components/SearchFilters';
import SearchResults from '../components/SearchResults';
import SearchAutocomplete from '../components/SearchAutocomplete';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';

const AdvancedSearch = () => {
  const router = useRouter();
  // Next: useSearchParams() returns the params object directly (no setter tuple).
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Bike[]>([]);
  const [categories, setCategories] = useState<BikeCategory[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ratings, setRatings] = useState<Record<string, ReviewStats>>({});
  const { user } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<SearchFilterState>({
    category: searchParams.get('category') || '',
    zone: searchParams.get('zone') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    availability: searchParams.get('availability') || 'all',
    condition: searchParams.get('condition') || 'all',
    sort: searchParams.get('sort') || 'newest',
  });

  const fetchResults = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(query && { q: query }),
        ...(filters.category && { category: filters.category }),
        ...(filters.zone && { zone: filters.zone }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        ...(filters.availability !== 'all' && { availability: filters.availability }),
        ...(filters.condition !== 'all' && { condition: filters.condition }),
        ...(filters.sort && { sort: filters.sort }),
      });

      const { data } = await api.get(`/search?${params}`);
      setResults(data.bikes || []);
      setCategories(data.categories);
      setZones(data.zones);
      if (data.priceRange) setPriceRange(data.priceRange);
      setPagination({ page: data.page, pages: data.pages, total: data.total });

      const sp = new URLSearchParams();
      if (query) sp.set('q', query);
      if (filters.category) sp.set('category', filters.category);
      if (filters.zone) sp.set('zone', filters.zone);
      if (filters.minPrice) sp.set('minPrice', filters.minPrice);
      if (filters.maxPrice) sp.set('maxPrice', filters.maxPrice);
      if (filters.availability !== 'all') sp.set('availability', filters.availability ?? 'all');
      if (filters.condition !== 'all') sp.set('condition', filters.condition ?? 'all');
      if (filters.sort !== 'newest') sp.set('sort', filters.sort ?? 'newest');
      const qs = sp.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, filters, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults(1);
  }, [fetchResults]);

  // One bulk request for every card's stars — never per-bike loops.
  useEffect(() => {
    if (results.length === 0) return;
    const ids = results.map(b => b._id).join(',');
    api.get(`/reviews/stats?bikeIds=${encodeURIComponent(ids)}`)
      .then(res => {
        if (res.data && typeof res.data === 'object') setRatings(res.data);
      })
      .catch(() => {});
  }, [results]);

  const fetchSuggestions = useCallback(async (q: string): Promise<void> => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`);
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 250);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFilterChange = (key: string, value: string): void => {
    setFilters(prev => ({ ...prev, [key]: value } as SearchFilterState));
  };

  const handleClearFilters = () => {
    setFilters({ category: '', zone: '', minPrice: '', maxPrice: '', availability: 'all', condition: 'all', sort: 'newest' });
    setQuery('');
  };

  const handleSuggestionClick = (suggestion: Suggestion): void => {
    if (suggestion.type === 'vehicle') {
      router.push(`/bike/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      setFilters(prev => ({ ...prev, category: suggestion.slug }));
      setQuery('');
    }
    setShowSuggestions(false);
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all' && v !== 'newest').length;

  const filterPanel = (
    <SearchFilters
      filters={filters}
      categories={categories}
      zones={zones}
      priceRange={priceRange}
      onFilterChange={handleFilterChange}
      onClear={handleClearFilters}
      compact
    />
  );

  return (
    <div className="bg-[#f4f6fa] min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Browse Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">Find the perfect ride for your Cox&apos;s Bazar adventure</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6" ref={searchRef}>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, model, or keyword..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-11 pr-10 py-3 rounded-xl text-sm outline-none transition-all bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 shadow-sm"
              aria-label="Search by brand, model, or keyword..."/>
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <SearchAutocomplete suggestions={suggestions} onSelect={handleSuggestionClick} />
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`lg:hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-white border shadow-sm ${showFilters ? 'border-orange-500 text-orange-600' : 'border-slate-200 text-slate-600'}`}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center bg-orange-500 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block sticky top-4">{filterPanel}</aside>

          {/* Results column */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <b className="text-slate-900">{pagination.total}</b> vehicle{pagination.total !== 1 ? 's' : ''} found
              </p>
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                <ArrowUpDown size={14} className="text-slate-400" />
                <span className="sr-only">Sort by</span>
                <select
                  value={filters.sort}
                  onChange={e => handleFilterChange('sort', e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-800 outline-none focus:border-orange-500"
                  aria-label="Sort results"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Rating: High to Low</option>
                  <option value="popular">Most Popular</option>
                  <option value="mileage">Mileage: High to Low</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingSkeleton key={i} rows={1} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-white border border-slate-200">
                <Search size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-black text-slate-900">No vehicles found</p>
                <p className="text-sm mt-1 text-slate-500">Try adjusting your filters or search terms</p>
                <button onClick={handleClearFilters} className="mt-4 px-4 py-2 rounded-lg text-sm font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                  aria-label="Clear all filters">
                  Clear Filters
                </button>
              </div>
            ) : (
              <SearchResults bikes={results} ratings={ratings} isAuthed={!!user} />
            )}

            {pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => fetchResults(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all border ${p === pagination.page ? 'bg-orange-500 border-orange-500 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300'}`}
                    aria-label={`Go to page ${p}`}
                    aria-current={p === pagination.page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-[#f4f6fa] shadow-2xl overflow-y-auto p-4 animate-slide-in">
            <div className="flex items-center justify-end mb-3">
              <button onClick={() => setShowFilters(false)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600" aria-label="Close filters">
                <X size={16} />
              </button>
            </div>
            {filterPanel}
            <button onClick={() => setShowFilters(false)} className="w-full py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all mb-6">
              Show {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
