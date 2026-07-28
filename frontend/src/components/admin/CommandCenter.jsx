import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Activity, Bike, Users, Tag, FileText, Palette, Inbox, Send, BarChart3, RefreshCw, Server } from 'lucide-react';

const QUICK_ACTIONS = [
  { tab: 'bikes', icon: Bike, label: 'Manage Bikes', color: 'var(--info-text)', bg: 'var(--info-bg)' },
  { tab: 'users', icon: Users, label: 'Manage Users', color: 'var(--success-text)', bg: 'var(--success-bg)' },
  { tab: 'coupons', icon: Tag, label: 'Coupons', color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  { tab: 'content', icon: FileText, label: 'Site Content', color: 'var(--accent-text)', bg: 'var(--accent-bg)' },
  { tab: 'branding', icon: Palette, label: 'Branding', color: 'var(--purple-text)', bg: 'var(--purple-bg)' },
  { tab: 'messages', icon: Inbox, label: 'Messages', color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  { tab: 'campaigns', icon: Send, label: 'Campaigns', color: '#ec4899', bg: '#ec489910' },
  { tab: 'health', icon: Activity, label: 'System Health', color: '#06b6d4', bg: '#06b6d410' },
];

const CommandCenter = ({ onNavigate, stats }) => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get('/admin/system-health');
      setHealth(res.data);
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const statusDot = (status) => {
    if (status === 'healthy' || status === 'connected') return <span className="inline-block w-2 h-2 rounded-full bg-green-500" />;
    if (status === 'degraded') return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />;
    return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(action => (
            <button key={action.tab} onClick={() => onNavigate(action.tab)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ background: action.bg, borderColor: action.color, color: action.color }}
              aria-label={`Go to ${action.label}`}>
              <action.icon size={24} />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Server size={16} /> System Status
            </h3>
            <button onClick={fetchHealth} className="p-1.5 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }} aria-label="Refresh health"><RefreshCw size={12} /></button>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
          ) : health ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Server</span>
                <span className="flex items-center gap-1.5">{statusDot(health.server?.status)} <span style={{ color: 'var(--text-primary)' }}>{health.server?.status || 'Unknown'}</span></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Database</span>
                <span className="flex items-center gap-1.5">{statusDot(health.database?.status)} <span style={{ color: 'var(--text-primary)' }}>{health.database?.status || 'Unknown'}</span></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Memory</span>
                <span style={{ color: 'var(--text-primary)' }}>{health.memory ? `${((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                <span style={{ color: 'var(--text-primary)' }}>{health.server?.uptime ? `${Math.floor(health.server.uptime / 86400)}d ${Math.floor((health.server.uptime % 86400) / 3600)}h` : 'N/A'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unable to load health data</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 size={16} /> Platform Overview
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Total Vehicles</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.bikes || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Total Users</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.users || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Active Coupons</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.coupons || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Categories</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.categories || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
