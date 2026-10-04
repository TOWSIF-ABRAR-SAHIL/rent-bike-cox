"use client";
import { useState, useEffect, useCallback } from 'react';
import api, { type ApiError } from '../../api/axios';
import { useToast } from '../useToast';
import { SkeletonTable } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Loader2, BarChart3 } from 'lucide-react';

interface DisputeUser { name?: string; email?: string; phoneNumber?: string }
interface DisputeBike { model?: string; brand?: string }
interface AdminDispute {
  _id: string;
  user?: DisputeUser;
  booking?: string;
  bike?: DisputeBike;
  reason?: string;
  description?: string;
  status?: string;
  resolution?: string;
  resolvedBy?: { name?: string };
  resolvedAt?: string;
  createdAt?: string;
}
interface DisputeStats { total: number; open: number; underReview: number; resolved: number; rejected: number }

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  'Under Review': { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  Resolved: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  Rejected: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
};

const REASON_LABELS: Record<string, string> = {
  refund: 'Refund Issue',
  damage: 'Vehicle Damage',
  overcharge: 'Overcharged',
  no_show: 'No Show',
  wrong_vehicle: 'Wrong Vehicle',
  late_return: 'Late Return',
  maintenance: 'Poor Maintenance',
  other: 'Other',
};

const RESOLVE_OPTIONS = ['Under Review', 'Resolved', 'Rejected'];

const DisputeManager = () => {
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [reasons, setReasons] = useState<{ _id: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolveStatus, setResolveStatus] = useState('Resolved');
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterReason) params.reason = filterReason;
      const [listRes, statsRes] = await Promise.allSettled([
        api.get('/disputes/admin/all', { params }),
        api.get('/disputes/admin/stats'),
      ]);
      if (listRes.status === 'fulfilled') {
        setDisputes(listRes.value.data.disputes || []);
        setTotalPages(listRes.value.data.pages || 1);
      } else {
        addToast('Failed to load disputes', 'error');
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.stats || null);
        setReasons(statsRes.value.data.byReason || []);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterReason, addToast]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const openRow = (id: string, currentStatus?: string) => {
    setExpanded(expanded === id ? null : id);
    setResolveStatus(currentStatus === 'Open' ? 'Under Review' : 'Resolved');
    setResolution('');
  };

  const handleResolve = async (id: string) => {
    if ((resolveStatus === 'Resolved' || resolveStatus === 'Rejected') && !resolution.trim()) {
      addToast('Write a resolution note for the customer', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/disputes/admin/${id}/resolve`, { status: resolveStatus, resolution: resolution.trim() });
      addToast(`Dispute marked ${resolveStatus}`, 'success');
      setExpanded(null);
      setResolution('');
      fetchDisputes();
    } catch (err) {
      const data = (err as ApiError).response?.data as { message?: string } | undefined;
      addToast(data?.message || 'Failed to resolve dispute', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statCards: { label: string; value: number; color: string }[] = stats ? [
    { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
    { label: 'Open', value: stats.open, color: 'var(--danger-text)' },
    { label: 'Under Review', value: stats.underReview, color: 'var(--warning-text)' },
    { label: 'Resolved', value: stats.resolved, color: 'var(--success-text)' },
    { label: 'Rejected', value: stats.rejected, color: 'var(--text-muted)' },
  ] : [];

  return (
    <div>
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {statCards.map(s => (
            <div key={s.label} className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-base)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="text-sm rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-base)' }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterReason} onChange={e => { setFilterReason(e.target.value); setPage(1); }}
          className="text-sm rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-base)' }} aria-label="Filter by reason">
          <option value="">All reasons</option>
          {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {reasons.length > 0 && (
          <span className="text-xs self-center flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <BarChart3 size={12} /> {reasons.map(r => `${REASON_LABELS[r._id] || r._id}: ${r.count}`).join(' · ')}
          </span>
        )}
      </div>

      {loading ? <SkeletonTable rows={4} cols={4} /> : disputes.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No disputes" description="No customer disputes match this filter." />
      ) : (
        <div className="space-y-3">
          {disputes.map(dp => {
            const st = STATUS_STYLE[dp.status ?? ''] || STATUS_STYLE.Open;
            const isOpen = expanded === dp._id;
            return (
              <div key={dp._id} className="rounded-xl overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-base)' }}>
                <button onClick={() => openRow(dp._id, dp.status)}
                  className="w-full flex items-center justify-between p-4 text-left" aria-label="Toggle dispute details">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {REASON_LABELS[dp.reason ?? ''] || dp.reason} — {dp.bike?.brand} {dp.bike?.model}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {dp.user?.name} ({dp.user?.email}) · Booking …{String(dp.booking).slice(-8)} · {dp.createdAt ? new Date(dp.createdAt).toLocaleDateString('en-BD') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded text-xs font-medium border" style={{ background: st.bg, color: st.text, borderColor: 'var(--border-base)' }}>
                      {dp.status}
                    </span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-base)' }}>
                    <div className="pt-3 grid sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>Customer: {dp.user?.name} · {dp.user?.phoneNumber || 'no phone'}</span>
                      <span>Email: {dp.user?.email}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{dp.description}</p>
                    {dp.resolution && (
                      <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                        <p className="text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle size={12} /> Resolution{dp.resolvedBy?.name ? ` by ${dp.resolvedBy.name}` : ''}</p>
                        {dp.resolution}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select value={resolveStatus} onChange={e => setResolveStatus(e.target.value)}
                        className="text-sm rounded-lg px-3 py-2 border sm:w-44" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-base)' }} aria-label="New dispute status">
                        {RESOLVE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input value={resolution} onChange={e => setResolution(e.target.value)}
                        placeholder="Resolution note shown to the customer"
                        className="text-sm rounded-lg px-3 py-2 border flex-1" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-base)' }} aria-label="Resolution note" />
                      <button onClick={() => handleResolve(dp._id)} disabled={saving}
                        className="btn-primary text-sm flex items-center gap-1 disabled:opacity-50" aria-label="Save dispute resolution">
                        {saving && <Loader2 size={14} className="animate-spin" />} Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-xs font-medium border ${page === i + 1 ? 'gradient-primary text-white' : ''}`}
              style={page !== i + 1 ? { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' } : { borderColor: 'transparent' }}
              aria-label={`Page ${i + 1}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisputeManager;
