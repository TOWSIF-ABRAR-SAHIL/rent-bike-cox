import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Activity, Server, Database, Cpu, HardDrive, RefreshCw, Bell, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)', icon: XCircle },
  error: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)', icon: AlertTriangle },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)', icon: AlertTriangle },
  info: { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'var(--info-border)', icon: Info },
  high: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)', icon: AlertTriangle },
  medium: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)', icon: AlertTriangle },
  low: { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'var(--info-border)', icon: Info },
};

const SystemHealthTab = () => {
  const { addToast } = useToast();
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAlert, setExpandedAlert] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/system-health');
      setHealth(res.data);
    } catch {
      setError('Failed to load system health');
      addToast('Failed to load health data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await api.get('/admin/notifications?limit=20');
      setAlerts(res.data.notifications || []);
    } catch { /* non-critical */ } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();
    fetchAlerts();
  }, [fetchHealth, fetchAlerts]);

  const statusColor = (s) => {
    if (s === 'healthy' || s === 'connected') return { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' };
    if (s === 'degraded') return { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' };
    return { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' };
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading && alertsLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  if (error) return (
    <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
      <p className="text-sm mb-3" style={{ color: 'var(--danger-text)' }}>{error}</p>
      <button onClick={() => { fetchHealth(); fetchAlerts(); }} className="btn-primary text-sm">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border flex items-center justify-between" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3">
          <Activity size={20} style={{ color: 'var(--accent-text)' }} />
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>System Health</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Server, database, memory & CPU monitoring</p>
          </div>
        </div>
        <button onClick={() => { fetchHealth(); fetchAlerts(); }} className="p-2 rounded-lg border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Refresh all"><RefreshCw size={16} /></button>
      </div>

      {health && (
        <>
          {/* Server */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Server size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Server</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className="inline-block px-2 py-0.5 rounded text-xs font-bold mt-1" style={statusColor(health.server?.status)}>{health.server?.status || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Uptime</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatUptime(health.server?.uptime)}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Environment</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{health.server?.environment || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Node</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{health.server?.nodeVersion || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Memory</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Heap Used</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatBytes(health.memory?.heapUsed)}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Heap Total</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatBytes(health.memory?.heapTotal)}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>RSS</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatBytes(health.memory?.rss)}</p>
              </div>
            </div>
            {health.memory?.heapTotal > 0 && (
              <div className="mt-3">
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (health.memory.heapUsed / health.memory.heapTotal) * 100)}%`, background: (health.memory.heapUsed / health.memory.heapTotal) > 0.8 ? 'var(--danger-text)' : 'var(--accent-text)' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(1)}% used</p>
              </div>
            )}
          </div>

          {/* Database */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Database</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className="inline-block px-2 py-0.5 rounded text-xs font-bold mt-1" style={statusColor(health.database?.status)}>{health.database?.status || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Response</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{health.database?.responseTime || 0}ms</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Collections</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{health.database?.collections || 0}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Documents</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(health.database?.totalDocuments || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* CPU */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>CPU</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Model</p>
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{health.cpu?.model || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cores</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{health.cpu?.cores || 0}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Alerts Section */}
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Alerts</h4>
            {alerts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
                {alerts.filter(a => !a.isRead).length} unread
              </span>
            )}
          </div>
          <button onClick={fetchAlerts} className="p-1.5 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }} aria-label="Refresh alerts"><RefreshCw size={12} /></button>
        </div>

        {alertsLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No alerts</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map(a => {
              const sev = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info;
              const Icon = sev.icon;
              const isExpanded = expandedAlert === a._id;
              return (
                <div key={a._id} className="rounded-xl border overflow-hidden" style={{ borderColor: sev.border }}>
                  <button onClick={() => setExpandedAlert(isExpanded ? null : a._id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                    style={{ background: a.isRead ? 'transparent' : sev.bg }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} style={{ color: sev.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(a.createdAt).toLocaleString('en-BD')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                        {a.severity}
                      </span>
                      {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3" style={{ borderTop: `1px solid ${sev.border}` }}>
                      <p className="text-xs pt-2" style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Type: {a.type} | ID: {a._id.slice(-8)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthTab;
