import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SearchFilters from '../components/SearchFilters';
import SearchResults from '../components/SearchResults';
import SearchAutocomplete from '../components/SearchAutocomplete';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const [filters, setFilters] = useState({
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

      const { data } = await axios.get(`${API}/search?${params}`);
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
      if (filters.availability !== 'all') sp.set('availability', filters.availability);
      if (filters.condition !== 'all') sp.set('condition', filters.condition);
      if (filters.sort !== 'newest') sp.set('sort', filters.sort);
      setSearchParams(sp, { replace: true });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, filters, setSearchParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults(1);
  }, [fetchResults]);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(q)}`);
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
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ category: '', zone: '', minPrice: '', maxPrice: '', availability: 'all', condition: 'all', sort: 'newest' });
    setQuery('');
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'vehicle') {
      navigate(`/bike/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      setFilters(prev => ({ ...prev, category: suggestion.slug }));
      setQuery('');
    }
    setShowSuggestions(false);
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all' && v !== 'newest').length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Search Vehicles</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Find the perfect ride for your Cox's Bazar adventure</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6" ref={searchRef}>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by brand, model, or keyword..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md" style={{ color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <SearchAutocomplete suggestions={suggestions} onSelect={handleSuggestionClick} />
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all sm:w-auto"
            style={{ background: 'var(--bg-card)', color: showFilters ? 'var(--accent-text)' : 'var(--text-secondary)', border: `1px solid ${showFilters ? 'var(--accent-border)' : 'var(--border-base)'}` }}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <SearchFilters
            filters={filters}
            categories={categories}
            zones={zones}
            priceRange={priceRange}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        )}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} rows={1} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
            <Search size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No vehicles found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search terms</p>
            <button onClick={handleClearFilters} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <SearchResults bikes={results} />
        )}

        {pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => fetchResults(p)}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: p === pagination.page ? 'var(--accent-bg)' : 'transparent',
                  color: p === pagination.page ? 'var(--accent-text)' : 'var(--text-muted)',
                  border: `1px solid ${p === pagination.page ? 'var(--accent-border)' : 'var(--border-base)'}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
