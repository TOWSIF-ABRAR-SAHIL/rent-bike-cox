import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Activity, Server, Database, Cpu, HardDrive, RefreshCw } from 'lucide-react';

const SystemHealthTab = () => {
  const { addToast } = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth(); }, [fetchHealth]);

  const statusColor = (s) => {
    if (s === 'healthy' || s === 'connected') return { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'var(--success-border)' };
    if (s === 'degraded') return { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)' };
    return { bg: 'var(--danger-bg)', text: 'var(--danger-text)', border: 'var(--danger-border)' };
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

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  if (error) return (
    <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
      <p className="text-sm mb-3" style={{ color: 'var(--danger-text)' }}>{error}</p>
      <button onClick={fetchHealth} className="btn-primary text-sm" aria-label="Retry">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Activity size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>System Health</h3>
          </div>
          <button onClick={fetchHealth} className="p-2 rounded-lg border transition-all hover:opacity-80" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Refresh health"><RefreshCw size={16} /></button>
        </div>
      </div>

      {health && (
        <>
          {/* Server Status */}
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Server size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Server</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className="text-sm font-bold mt-1 px-2 py-0.5 rounded inline-block" style={statusColor(health.server?.status)}>{health.server?.status || 'Unknown'}</p>
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
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Node Version</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{health.server?.nodeVersion || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-4">
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
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Database size={16} style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Database</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className="text-sm font-bold mt-1 px-2 py-0.5 rounded inline-block" style={statusColor(health.database?.status)}>{health.database?.status || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Response Time</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{health.database?.responseTime || 0}ms</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Collections</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{health.database?.collections || 0}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Documents</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(health.database?.totalDocuments || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* CPU */}
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-2 mb-4">
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
    </div>
  );
};

export default SystemHealthTab;
