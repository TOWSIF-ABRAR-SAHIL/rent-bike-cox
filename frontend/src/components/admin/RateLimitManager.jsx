import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Shield, RefreshCw, Clock, Activity } from 'lucide-react';

const SEVERITY_CONFIG = {
  auth: { label: 'Strict', color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  booking: { label: 'Moderate', color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  payment: { label: 'Strict', color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  financial: { label: 'Generous', color: 'var(--info-text)', bg: 'var(--info-bg)' },
  upload: { label: 'Strict', color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  search: { label: 'Moderate', color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  dashboard: { label: 'Generous', color: 'var(--info-text)', bg: 'var(--info-bg)' },
  fleet: { label: 'Moderate', color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
};

const RateLimitManager = () => {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/rate-limits');
      setConfigs(res.data || []);
    } catch {
      addToast('Failed to load rate limit configs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Rate Limiter Status</h3>
          </div>
          <button onClick={fetchConfigs} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Refresh rate limiter status"><RefreshCw size={16} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Rate limiters protect the API from abuse. Each endpoint group has a configurable window and max request count.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No rate limiters configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {configs.map((cfg, i) => {
            const severity = SEVERITY_CONFIG[cfg.name] || { label: 'Custom', color: 'var(--text-primary)', bg: 'var(--bg-secondary)' };
            return (
              <div key={i} className="glass rounded-2xl p-4 border transition-all hover:opacity-90" style={{ borderColor: 'var(--border-base)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{cfg.name} API</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: severity.bg, color: severity.color }}>{severity.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Activity size={10} /> Max
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.max}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={10} /> Window
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.windowMinutes}m</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Shield size={10} /> Rate
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(cfg.max / (cfg.windowMs / 60000)).toFixed(1)}/m</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RateLimitManager;
