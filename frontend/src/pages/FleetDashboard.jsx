import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FleetSummary from '../components/FleetSummary';
import FleetHealthChart from '../components/FleetHealthChart';
import FleetUtilizationChart from '../components/FleetUtilizationChart';
import FleetBikeRow from '../components/FleetBikeRow';
import FleetFilter from '../components/FleetFilter';
import BulkOperations from '../components/BulkOperations';
import LoadingSkeleton from '../components/LoadingSkeleton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FleetDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all', condition: 'all', zone: 'all', sort: '-createdAt' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBikes, setSelectedBikes] = useState([]);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/fleet/summary`);
      setSummary(data);
    } catch (err) {
      console.error('Fleet summary error:', err);
    }
  }, []);

  const fetchUtilization = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/fleet/utilization?days=30`);
      setUtilization(data);
    } catch (err) {
      console.error('Fleet utilization error:', err);
    }
  }, []);

  const fetchBikes = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.condition !== 'all' && { condition: filters.condition }),
        ...(filters.zone !== 'all' && { zone: filters.zone }),
        ...(filters.sort && { sort: filters.sort }),
      });
      const { data } = await axios.get(`${API}/fleet/bikes?${params}`);
      setBikes(data.bikes);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      console.error('Fleet bikes error:', err);
      setError('Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([fetchSummary(), fetchUtilization()]);
  }, [fetchSummary, fetchUtilization]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBikes(1);
  }, [fetchBikes]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page) => {
    fetchBikes(page);
  };

  const handleToggleSelect = (bikeId) => {
    setSelectedBikes(prev =>
      prev.includes(bikeId) ? prev.filter(id => id !== bikeId) : [...prev, bikeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBikes.length === bikes.length) {
      setSelectedBikes([]);
    } else {
      setSelectedBikes(bikes.map(b => b._id));
    }
  };

  const handleClearSelection = () => {
    setSelectedBikes([]);
  };

  const handleBulkComplete = () => {
    setSelectedBikes([]);
    fetchBikes(pagination.page);
    fetchSummary();
    fetchUtilization();
  };

  const handleExport = async () => {
    try {
      const { data } = await axios.get(`${API}/fleet/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fleet-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Fleet Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Monitor and manage your vehicle fleet</p>
          </div>
          <button
            onClick={handleExport}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
            {error}
          </div>
        )}

        {summary ? (
          <FleetSummary summary={summary} />
        ) : (
          <LoadingSkeleton rows={2} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {summary ? (
            <FleetHealthChart conditionMap={summary.conditionMap} />
          ) : (
            <LoadingSkeleton rows={1} />
          )}
          {utilization ? (
            <FleetUtilizationChart data={utilization} />
          ) : (
            <LoadingSkeleton rows={1} />
          )}
        </div>

        <div className="mt-8">
          <FleetFilter filters={filters} onFilterChange={handleFilterChange} />
        </div>

        <div className="mt-6">
          <BulkOperations
            selectedBikes={selectedBikes}
            onClearSelection={handleClearSelection}
            onComplete={handleBulkComplete}
          />

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-base)' }}>
              <div className="flex items-center gap-3">
                {bikes.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selectedBikes.length === bikes.length && bikes.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                )}
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Vehicles ({pagination.total})
                </h3>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
            </div>
            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : bikes.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No vehicles found</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-base)' }}>
                {bikes.map(bike => (
                  <FleetBikeRow
                    key={bike._id}
                    bike={bike}
                    selected={selectedBikes.includes(bike._id)}
                    onToggle={handleToggleSelect}
                  />
                ))}
              </div>
            )}
            {pagination.pages > 1 && (
              <div className="px-4 py-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid var(--border-base)' }}>
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
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;
