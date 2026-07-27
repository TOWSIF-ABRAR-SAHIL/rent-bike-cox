import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

const HistoryFilter = ({ filters, onFilterChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filters.type}
          onChange={e => onFilterChange('type', e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          aria-label="Filter by event type"
        >
          <option value="all">All Events</option>
          <option value="booking">Bookings</option>
          <option value="maintenance">Maintenance</option>
          <option value="status">Status Changes</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-secondary)' }}
          aria-label="Toggle date range filter"
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal size={14} />
          Date Range
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-3 pt-3 flex flex-col sm:flex-row gap-3" style={{ borderTop: '1px solid var(--border-base)' }}>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
            <input
              type="date"
              value={filters.from}
              onChange={e => onFilterChange('from', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
            <input
              type="date"
              value={filters.to}
              onChange={e => onFilterChange('to', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryFilter;
