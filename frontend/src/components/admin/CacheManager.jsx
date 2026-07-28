import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Database, RefreshCw, Trash2, Search, X, Zap, Clock, BarChart3 } from 'lucide-react';

const CacheManager = () => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [flushing, setFlushing] = useState(false);

  const fetchCache = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cache');
      setData(res.data);
    } catch {
      addToast('Failed to load cache data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCache();
  }, [fetchCache]);

  const handleFlush = async () => {
    if (!window.confirm('Flush all cache entries? This may temporarily impact performance.')) return;
    setFlushing(true);
    try {
      await api.delete('/admin/cache');
      addToast('Cache flushed successfully', 'success');
      fetchCache();
    } catch {
      addToast('Failed to flush cache', 'error');
    } finally {
      setFlushing(false);
    }
  };

  const handleDeleteKey = async (key) => {
    try {
      await api.delete(`/admin/cache/key/${encodeURIComponent(key)}`);
      addToast(`Deleted key: ${key}`, 'success');
      fetchCache();
    } catch {
      addToast('Failed to delete key', 'error');
    }
  };

  const filtered = data?.keys?.filter(k =>
    k.key.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={18} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Cache Manager</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleFlush} disabled={flushing} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }} aria-label="Flush all cache">
              <Trash2 size={14} /> {flushing ? 'Flushing...' : 'Flush All'}
            </button>
            <button onClick={fetchCache} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Refresh cache"><RefreshCw size={16} /></button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><Database size={12} /> Entries</div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{data.stats.size}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><BarChart3 size={12} /> Max</div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{data.stats.maxSize}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><Zap size={12} /> Hit Rate</div>
              <p className="text-lg font-bold" style={{ color: data.stats.hitRate > 50 ? 'var(--success-text)' : 'var(--warning-text)' }}>{data.stats.hitRate}%</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><Clock size={12} /> Hits/Misses</div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{data.stats.hits}/{data.stats.misses}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cache Keys ({data?.keys?.length || 0})</h4>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search keys..." className="input-dark text-xs w-full pl-8 !py-1.5" aria-label="Search cache keys" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label="Clear search"><X size={12} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>
        </div>

        {loading ? (
          <div className="space-y-1">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>{searchTerm ? 'No keys match your filter' : 'No cache entries'}</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0" style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="p-2 font-medium" style={{ color: 'var(--text-muted)' }}>Key</th>
                  <th className="p-2 font-medium w-16" style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th className="p-2 font-medium w-20" style={{ color: 'var(--text-muted)' }}>TTL</th>
                  <th className="p-2 font-medium w-8" style={{ color: 'var(--text-muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr key={i} className="border-b transition-colors" style={{ borderColor: 'var(--border-base)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                    <td className="p-2 font-mono truncate max-w-[150px] sm:max-w-[250px]" style={{ color: 'var(--text-primary)' }} title={entry.key}>{entry.key}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
                        {entry.valueType}
                      </span>
                    </td>
                    <td className="p-2" style={{ color: entry.ttl < 30 ? 'var(--warning-text)' : 'var(--text-secondary)' }}>
                      {entry.ttl > 3600 ? `${Math.round(entry.ttl / 3600)}h` : entry.ttl > 60 ? `${Math.round(entry.ttl / 60)}m` : `${entry.ttl}s`}
                    </td>
                    <td className="p-2">
                      <button onClick={() => handleDeleteKey(entry.key)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--danger-text)' }} aria-label={`Delete key ${entry.key}`}>
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheManager;
