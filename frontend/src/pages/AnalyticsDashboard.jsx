import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RevenueChart from '../components/RevenueChart';
import BookingTrendChart from '../components/BookingTrendChart';
import CategoryPerformance from '../components/CategoryPerformance';
import TopBikes from '../components/TopBikes';
import CustomerInsights from '../components/CustomerInsights';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Calendar, Download } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AnalyticsDashboard = () => {
  const [days, setDays] = useState(30);
  const [revenue, setRevenue] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categories, setCategories] = useState(null);
  const [topBikes, setTopBikes] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [revRes, trendRes, catRes, bikeRes, custRes] = await Promise.all([
        axios.get(`${API}/analytics/revenue?days=${days}`),
        axios.get(`${API}/analytics/bookings?days=${days}`),
        axios.get(`${API}/analytics/categories?days=${days}`),
        axios.get(`${API}/analytics/top-bikes?days=${days}&limit=5`),
        axios.get(`${API}/analytics/customers?days=${days}`),
      ]);
      setRevenue(revRes.data);
      setTrends(trendRes.data);
      setCategories(catRes.data);
      setTopBikes(bikeRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const handleExport = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/export?days=${days}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${days}d-${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            {revenue && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue.totalRevenue.toLocaleString()} TK</p>
                  <p className="text-xs mt-1" style={{ color: revenue.revenueGrowth >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                    {revenue.revenueGrowth >= 0 ? '+' : ''}{revenue.revenueGrowth}% vs prev period
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Bookings</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue.totalBookings}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Revenue/Day</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue.avgRevenuePerDay.toLocaleString()} TK</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Period</p>
                  <p className="text-xl font-bold mt-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={18} /> {days} days
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {revenue && <RevenueChart data={revenue} />}
              {trends && <BookingTrendChart data={trends} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {categories && <CategoryPerformance data={categories} />}
              {topBikes && <TopBikes data={topBikes} />}
            </div>

            {customers && <CustomerInsights data={customers} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
