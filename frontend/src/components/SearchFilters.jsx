const SearchFilters = ({ filters, categories, zones, priceRange, onFilterChange, onClear }) => {
  return (
    <div className="p-5 rounded-xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Filters</h3>
        <button onClick={onClear} className="text-xs px-2 py-1 rounded-md" style={{ color: 'var(--accent-text)' }}>Clear all</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="filter-category" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Category</label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={e => onFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-zone" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Zone</label>
          <select
            id="filter-zone"
            value={filters.zone}
            onChange={e => onFilterChange('zone', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="">All Zones</option>
            {zones.map(z => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-condition" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Condition</label>
          <select
            id="filter-condition"
            value={filters.condition}
            onChange={e => onFilterChange('condition', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Conditions</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-availability" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Availability</label>
          <select
            id="filter-availability"
            value={filters.availability}
            onChange={e => onFilterChange('availability', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="all">All</option>
            <option value="true">Available Now</option>
            <option value="false">Unavailable</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-minPrice" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Min Price (TK/hr)</label>
          <input
            id="filter-minPrice"
            type="number"
            placeholder={priceRange.min}
            value={filters.minPrice}
            onChange={e => onFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label htmlFor="filter-maxPrice" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Price (TK/hr)</label>
          <input
            id="filter-maxPrice"
            type="number"
            placeholder={priceRange.max}
            value={filters.maxPrice}
            onChange={e => onFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="filter-sort" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Sort By</label>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={e => onFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="mileage">Mileage: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
