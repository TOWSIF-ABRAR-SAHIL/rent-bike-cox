import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import RevenueChart from '../components/RevenueChart';
import BookingTrendChart from '../components/BookingTrendChart';
import CategoryPerformance from '../components/CategoryPerformance';
import TopBikes from '../components/TopBikes';
import CustomerInsights from '../components/CustomerInsights';
import RentalDurationChart from '../components/RentalDurationChart';
import FinancialSummary from '../components/FinancialSummary';
import HourlyDistribution from '../components/HourlyDistribution';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Calendar, Download, RefreshCw } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [days, setDays] = useState(30);
  const [revenue, setRevenue] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categories, setCategories] = useState(null);
  const [topBikes, setTopBikes] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [duration, setDuration] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [revRes, trendRes, catRes, bikeRes, custRes, durRes, finRes] = await Promise.allSettled([
        api.get(`/analytics/revenue?days=${days}`),
        api.get(`/analytics/bookings?days=${days}`),
        api.get(`/analytics/categories?days=${days}`),
        api.get(`/analytics/top-bikes?days=${days}&limit=5`),
        api.get(`/analytics/customers?days=${days}`),
        api.get(`/analytics/duration?days=${days}`),
        api.get(`/analytics/financial?days=${days}`),
      ]);

      if (revRes.status === 'fulfilled') setRevenue(revRes.value.data);
      if (trendRes.status === 'fulfilled') setTrends(trendRes.value.data);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data);
      if (bikeRes.status === 'fulfilled') setTopBikes(bikeRes.value.data);
      if (custRes.status === 'fulfilled') setCustomers(custRes.value.data);
      if (durRes.status === 'fulfilled') setDuration(durRes.value.data);
      if (finRes.status === 'fulfilled') setFinancial(finRes.value.data);
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
      const { data } = await api.get(`/analytics/export?days=${days}`, { responseType: 'blob' });
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
              aria-label="Select time period"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-base)' }}
              aria-label="Refresh data"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
              aria-label="Export data"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue?.totalRevenue?.toLocaleString() || 0} TK</p>
                  <p className="text-xs mt-1" style={{ color: revenue.revenueGrowth >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                    {revenue?.revenueGrowth >= 0 ? '+' : ''}{revenue?.revenueGrowth || 0}% vs prev period
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Bookings</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue?.totalBookings || 0}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Revenue/Day</p>
                  <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{revenue?.avgRevenuePerDay?.toLocaleString() || 0} TK</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Rental Duration</p>
                  <p className="text-xl font-bold mt-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={18} /> {duration?.avgHours || 0}h
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {duration && <RentalDurationChart data={duration} />}
              {trends && <HourlyDistribution data={trends} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {financial && <FinancialSummary data={financial} />}
            </div>

            {customers && <CustomerInsights data={customers} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
