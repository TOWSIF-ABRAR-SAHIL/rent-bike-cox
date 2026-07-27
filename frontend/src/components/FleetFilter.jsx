import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, SlidersHorizontal } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FleetFilter = ({ filters, onFilterChange }) => {
  const [zones, setZones] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data } = await axios.get(`${API}/zones/active`);
        setZones(data);
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      }
    };
    fetchZones();
  }, []);

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <select
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-secondary)' }}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-3 pt-3 flex flex-col sm:flex-row gap-3" style={{ borderTop: '1px solid var(--border-base)' }}>
          <select
            value={filters.condition}
            onChange={e => onFilterChange('condition', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Conditions</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <select
            value={filters.zone}
            onChange={e => onFilterChange('zone', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Zones</option>
            {zones.map(z => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>

          <select
            value={filters.sort}
            onChange={e => onFilterChange('sort', e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-pricePerHour">Price: High to Low</option>
            <option value="pricePerHour">Price: Low to High</option>
            <option value="-currentMileage">Mileage: High to Low</option>
            <option value="model">Model: A-Z</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default FleetFilter;
