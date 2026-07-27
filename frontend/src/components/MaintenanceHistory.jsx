import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from './useToast';
import { History, Trash2, Filter, Loader2 } from 'lucide-react';

const TYPE_LABELS = {
  service: 'Service', repair: 'Repair', inspection: 'Inspection',
  oil_change: 'Oil Change', tire_replacement: 'Tire Replacement',
  brake_service: 'Brake Service', battery: 'Battery', other: 'Other',
};

const STATUS_COLORS = {
  completed: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  in_progress: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  scheduled: { bg: 'var(--info-bg, rgba(59,130,246,0.1))', text: 'var(--info-text, #3b82f6)' },
  cancelled: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

const MaintenanceHistory = ({ bikeId }) => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (typeFilter) params.append('type', typeFilter);
        const res = await api.get(`/maintenance/bike/${bikeId}?${params}`);
        if (!cancelled) {
          setLogs(res.data.logs);
          setTotalPages(res.data.pages);
        }
      } catch {
        if (!cancelled) addToast('Failed to fetch maintenance history', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [bikeId, page, typeFilter, addToast]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance log?')) return;
    setDeleting(id);
    try {
      await api.delete(`/maintenance/${id}`);
      setLogs(prev => prev.filter(l => l._id !== id));
      addToast('Deleted', 'success');
    } catch {
      addToast('Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="h-4 rounded w-3/4 mb-2" style={{ background: 'var(--hover-bg)' }} />
            <div className="h-3 rounded w-1/2" style={{ background: 'var(--hover-bg)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: 'var(--accent-text)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Maintenance History</h3>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="input-dark !py-1.5 !px-2.5 text-xs">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No maintenance logs found</p>
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const sc = STATUS_COLORS[log.status] || STATUS_COLORS.completed;
            return (
              <div key={log._id} className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
                        {TYPE_LABELS[log.type] || log.type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: sc.bg, color: sc.text }}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                    {log.description && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{log.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{new Date(log.performedAt).toLocaleDateString()}</span>
                      {log.cost > 0 && <span>{log.cost} TK</span>}
                      {log.mileage && <span>{log.mileage.toLocaleString()} km</span>}
                      {log.performedBy && <span>by {log.performedBy.name}</span>}
                    </div>
                    {log.notes && <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{log.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(log._id)} disabled={deleting === log._id} className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0" style={{ color: 'var(--danger-text)' }}>
                    {deleting === log._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Prev</button>
          <span className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Next</button>
        </div>
      )}
    </div>
  );
};

export default MaintenanceHistory;
