import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import HistoryTimeline from '../components/HistoryTimeline';
import HistoryFilter from '../components/HistoryFilter';
import HistoryStats from '../components/HistoryStats';
import LoadingSkeleton from '../components/LoadingSkeleton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VehicleHistory = ({ bikeId, onClose }) => {
  const [bike, setBike] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ type: 'all', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      const { data } = await axios.get(`${API}/vehicle-history/${bikeId}/history?${params}`);
      setBike(data.bike);
      setEvents(data.events);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      console.error('Vehicle history error:', err);
      setError('Failed to load vehicle history');
    } finally {
      setLoading(false);
    }
  }, [bikeId, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/vehicle-history/${bikeId}/stats?days=90`);
      setStats(data);
    } catch (err) {
      console.error('Vehicle stats error:', err);
    }
  }, [bikeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory(1);
  }, [fetchHistory]);

  const handlePageChange = (page) => {
    fetchHistory(page);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    try {
      const { data } = await axios.get(`${API}/vehicle-history/${bikeId}/export-history`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vehicle-history-${bike?.model || 'bike'}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {bike ? `${bike.brand} ${bike.model}` : 'Vehicle History'}
          </h2>
          {bike && (
            <div className="flex items-center gap-3 mt-1">
              {bike.category && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.category.name}</span>
              )}
              {bike.zone && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.zone.name}</span>
              )}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.pricePerHour} TK/hr</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
           aria-label="Export data">
            Export CSV
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
             aria-label="Close">
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
          {error}
        </div>
      )}

      {stats ? (
        <HistoryStats stats={stats} />
      ) : (
        <LoadingSkeleton rows={1} />
      )}

      <div className="mt-6">
        <HistoryFilter filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : events.length === 0 ? (
          <div className="p-12 text-center rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No history events found</p>
          </div>
        ) : (
          <HistoryTimeline events={events} />
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
              style={{
                background: p === pagination.page ? 'var(--accent-bg)' : 'transparent',
                color: p === pagination.page ? 'var(--accent-text)' : 'var(--text-muted)',
                border: `1px solid ${p === pagination.page ? 'var(--accent-border)' : 'var(--border-base)'}`,
              }}
             aria-label="Go to page">
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleHistory;
