import { memo } from 'react';
import { X, SlidersHorizontal, ArrowUpDown, DollarSign } from 'lucide-react';

const SearchFilters = ({ filters, categories, priceRange, onFilterChange, onClear }) => {
  const activeFilters = [];
  if (filters.category) {
    const cat = categories.find(c => c.slug === filters.category);
    activeFilters.push({ key: 'category', label: cat?.name || filters.category });
  }
  if (filters.minPrice) activeFilters.push({ key: 'minPrice', label: `Min ${filters.minPrice} TK` });
  if (filters.maxPrice) activeFilters.push({ key: 'maxPrice', label: `Max ${filters.maxPrice} TK` });
  if (filters.availability !== 'all') activeFilters.push({ key: 'availability', label: filters.availability === 'true' ? 'Available' : 'Unavailable' });
  if (filters.condition !== 'all') activeFilters.push({ key: 'condition', label: filters.condition });

  const removeFilter = (key) => {
    if (key === 'category') onFilterChange(key, '');
    else if (key === 'availability' || key === 'condition') onFilterChange(key, 'all');
    else onFilterChange(key, '');
  };

  return (
    <div className="glass rounded-2xl p-5 mb-6 animate-slide-up" style={{ border: '1px solid var(--border-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--accent-text)' }} />
          Filters
        </h3>
        {(activeFilters.length > 0 || filters.sort !== 'newest') && (
          <button onClick={onClear} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-red-500/10" style={{ color: 'var(--danger-text)' }} aria-label="Clear all filters">
            Clear all
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map(f => (
            <span key={f.key} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              {f.label}
              <button onClick={() => removeFilter(f.key)} className="ml-0.5 p-0.5 rounded-full hover:bg-black/10" aria-label={`Remove ${f.label} filter`}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category */}
        <div>
          <label htmlFor="filter-category" className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Category</label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={e => onFilterChange('category', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="filter-condition" className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Condition</label>
          <select
            id="filter-condition"
            value={filters.condition}
            onChange={e => onFilterChange('condition', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Conditions</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="filter-availability" className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Availability</label>
          <select
            id="filter-availability"
            value={filters.availability}
            onChange={e => onFilterChange('availability', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="all">All</option>
            <option value="true">Available Now</option>
            <option value="false">Unavailable</option>
          </select>
        </div>

        {/* Price Range - Dual Inputs */}
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            <DollarSign size={12} className="inline" /> Price Range (TK/hr)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={priceRange.min || 'Min'}
              value={filters.minPrice}
              onChange={e => onFilterChange('minPrice', e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
              aria-label="Minimum price"
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
            <input
              type="number"
              placeholder={priceRange.max || 'Max'}
              value={filters.maxPrice}
              onChange={e => onFilterChange('maxPrice', e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
              aria-label="Maximum price"
            />
          </div>
          {/* Quick Price Buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'Under 200', min: '', max: '200' },
              { label: '200-300', min: '200', max: '300' },
              { label: '300-500', min: '300', max: '500' },
              { label: '500+', min: '500', max: '' },
            ].map(p => {
              const isActive = filters.minPrice === p.min && filters.maxPrice === p.max;
              return (
                <button key={p.label} onClick={() => { onFilterChange('minPrice', p.min); onFilterChange('maxPrice', p.max); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--accent-bg)' : 'var(--input-bg)',
                    color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
                    border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border-base)'}`,
                  }}
                  aria-label={`Filter by ${p.label} TK`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort */}
        <div className="sm:col-span-2">
          <label htmlFor="filter-sort" className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            <ArrowUpDown size={12} className="inline" /> Sort By
          </label>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={e => onFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all min-h-11"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)', color: 'var(--text-primary)' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Rating: High to Low</option>
            <option value="popular">Most Popular</option>
            <option value="mileage">Mileage: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default memo(SearchFilters);
