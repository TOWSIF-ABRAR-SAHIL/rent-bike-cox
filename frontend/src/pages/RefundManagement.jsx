import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { DollarSign, CheckCircle, XCircle, Clock, Filter, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const STATUS_CONFIG = {
  REQUESTED: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)' },
  APPROVED: { bg: 'var(--info-bg)', text: 'var(--info-text)', border: 'var(--info-border)' },
  PROCESSING: { bg: 'var(--purple-bg)', text: 'var(--purple-text)', border: 'var(--purple-border)' },
  COMPLETED: { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'var(--success-border)' },
  REJECTED: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', border: 'var(--danger-border)' },
};

const STATUS_LABELS = ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'];

const formatTK = (paisa) => {
  const tk = (paisa / 100).toFixed(2);
  return tk.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });

const RefundManagement = () => {
  const { addToast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchRefunds = useCallback(async (p = page, s = statusFilter) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = { page: p, limit };
      if (s) params.status = s;
      const { data } = await api.get('/payment/refunds', { params });
      setRefunds(data.refunds || []);
      setTotal(data.total || 0);
    } catch {
      setFetchError('Failed to load refunds. Please try again.');
      addToast('Failed to load refunds', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRefunds(1, statusFilter); }, [statusFilter, fetchRefunds]);

  const handleFilterChange = useCallback((s) => {
    const val = s === 'ALL' ? '' : s;
    setStatusFilter(val);
    setPage(1);
  }, []);

  const handleApprove = useCallback(async (refundId) => {
    setActionLoading(refundId);
    try {
      await api.post(`/payment/refunds/${refundId}/approve`);
      addToast('Refund approved', 'success');
      fetchRefunds();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to approve', 'error');
    } finally {
      setActionLoading('');
    }
  }, [addToast, fetchRefunds]);

  const handleReject = useCallback(async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await api.post(`/payment/refunds/${rejectModal}/reject`, { reason: rejectReason });
      addToast('Refund rejected', 'success');
      setRejectModal(null);
      setRejectReason('');
      fetchRefunds();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setActionLoading('');
    }
  }, [rejectModal, rejectReason, addToast, fetchRefunds]);

  const handleProcess = useCallback(async (refundId) => {
    setActionLoading(refundId);
    try {
      await api.post(`/payment/refunds/${refundId}/process`);
      addToast('Refund processing started', 'success');
      fetchRefunds();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process', 'error');
    } finally {
      setActionLoading('');
    }
  }, [addToast, fetchRefunds]);

  const totalPages = Math.ceil(total / limit);

  const stats = useMemo(() => {
    let totalAmount = 0, pending = 0, approved = 0;
    refunds.forEach(r => {
      totalAmount += r.amountPaisa;
      if (r.status === 'REQUESTED') pending++;
      if (r.status === 'APPROVED') approved++;
    });
    return { totalAmount, pending, approved };
  }, [refunds]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="skeleton h-8 rounded-lg w-48" />
      <div className="skeleton h-4 rounded-lg w-full max-w-96" />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-10 rounded-lg w-24" />
        ))}
      </div>
      <SkeletonTable rows={5} cols={7} />
    </div>
  );

  if (fetchError) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center glass rounded-2xl p-8 max-w-md mx-auto">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--danger-text)' }} />
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => fetchRefunds()} className="btn-primary" aria-label="Retry loading refunds">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Refund Management</h1>
          <span className="px-3 py-1 rounded-full text-xs font-bold glass" style={{ color: 'var(--accent-text)' }}>{total}</span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Review and process refund requests</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Refunds</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Amount</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatTK(stats.totalAmount)} TK</p>
        </div>
        <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Pending</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--warning-text)' }}>{stats.pending}</p>
        </div>
        <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Approved</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--info-text)' }}>{stats.approved}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['ALL', ...STATUS_LABELS].map(s => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`flex items-center gap-1.5 px-4 py-2.5 min-h-10 rounded-xl text-sm font-medium transition-all duration-200 ${
              (s === 'ALL' && !statusFilter) || statusFilter === (s === 'ALL' ? '' : s)
                ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'
            }`}
            style={((s === 'ALL' && !statusFilter) || statusFilter === (s === 'ALL' ? '' : s))
              ? { color: 'white' } : { color: 'var(--text-secondary)' }}
            aria-label={`Filter by ${s} status`}
            aria-pressed={(s === 'ALL' && !statusFilter) || statusFilter === (s === 'ALL' ? '' : s)}
          >
            {s === 'ALL' && <Filter size={14} />}
            {s === 'REQUESTED' && <Clock size={14} />}
            {s === 'APPROVED' && <CheckCircle size={14} />}
            {s === 'PROCESSING' && <RefreshCw size={14} />}
            {s === 'COMPLETED' && <DollarSign size={14} />}
            {s === 'REJECTED' && <XCircle size={14} />}
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {refunds.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No refunds found"
          description="There are no refund requests matching your filter."
        />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {refunds.map(r => (
              <div key={r._id} className="glass rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{r.refundId}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{r.userId?.name} · {r.userId?.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{
                    background: STATUS_CONFIG[r.status]?.bg,
                    color: STATUS_CONFIG[r.status]?.text,
                    borderColor: STATUS_CONFIG[r.status]?.border,
                  }}>{r.status}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>{r.bookingId?.invoiceNumber || 'N/A'}</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatTK(r.amountPaisa)} TK</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</div>
                {r.status === 'REQUESTED' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleApprove(r.refundId)} disabled={actionLoading === r.refundId}
                      className="flex-1 px-3 py-2.5 min-h-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                      style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }}
                      aria-label={`Approve refund ${r.refundId}`}>
                      <CheckCircle size={14} className="mr-1" /> Approve
                    </button>
                    <button onClick={() => { setRejectModal(r.refundId); setRejectReason(''); }}
                      disabled={actionLoading === r.refundId}
                      className="flex-1 px-3 py-2.5 min-h-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                      aria-label={`Reject refund ${r.refundId}`}>
                      <XCircle size={14} className="mr-1" /> Reject
                    </button>
                  </div>
                )}
                {r.status === 'APPROVED' && (
                  <div className="pt-1">
                    <button onClick={() => handleProcess(r.refundId)} disabled={actionLoading === r.refundId}
                      className="w-full px-3 py-2.5 min-h-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                      style={{ background: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info-border)' }}
                      aria-label={`Process refund ${r.refundId}`}>
                      <RefreshCw size={14} className="mr-1" /> Process Refund
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block glass rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                <tr>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Refund ID</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>User</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Booking</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Amount</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Created</th>
                  <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map(r => (
                  <tr key={r._id} className="border-b transition-colors"
                    style={{ borderColor: 'var(--border-base)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                    <td className="p-4 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{r.refundId}</td>
                    <td className="p-4">
                      <div style={{ color: 'var(--text-primary)' }}>{r.userId?.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.userId?.email}</div>
                    </td>
                    <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{r.bookingId?.invoiceNumber || 'N/A'}</td>
                    <td className="p-4 font-bold" style={{ color: 'var(--text-primary)' }}>{formatTK(r.amountPaisa)} TK</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{
                        background: STATUS_CONFIG[r.status]?.bg,
                        color: STATUS_CONFIG[r.status]?.text,
                        borderColor: STATUS_CONFIG[r.status]?.border,
                      }}>{r.status}</span>
                    </td>
                    <td className="p-4" style={{ color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {r.status === 'REQUESTED' && (
                          <>
                            <button onClick={() => handleApprove(r.refundId)} disabled={actionLoading === r.refundId}
                              className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                              style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }}
                              aria-label={`Approve refund ${r.refundId}`}>
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => { setRejectModal(r.refundId); setRejectReason(''); }}
                              disabled={actionLoading === r.refundId}
                              className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                              style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                              aria-label={`Reject refund ${r.refundId}`}>
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button onClick={() => handleProcess(r.refundId)} disabled={actionLoading === r.refundId}
                            className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                            style={{ background: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info-border)' }}
                            aria-label={`Process refund ${r.refundId}`}>
                            <RefreshCw size={14} />
                          </button>
                        )}
                        {!['REQUESTED', 'APPROVED'].includes(r.status) && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchRefunds(p); }}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium glass transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchRefunds(p); }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${p === page ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`}
                    style={p === page ? { color: 'white' } : { color: 'var(--text-secondary)' }}
                    aria-label={`Go to page ${p}`} aria-current={p === page ? 'page' : undefined}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchRefunds(p); }}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium glass transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => { setRejectModal(null); setRejectReason(''); }}>
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <XCircle size={20} style={{ color: 'var(--danger-text)' }} /> Reject Refund
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Provide a reason for rejecting refund <strong>{rejectModal}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="input-dark w-full text-sm min-h-[100px] resize-none mb-4"
              placeholder="Enter rejection reason..."
              aria-label="Rejection reason"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium glass"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Cancel rejection">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === rejectModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
                aria-label="Confirm reject refund">
                {actionLoading === rejectModal ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagement;
