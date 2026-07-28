import { useState, useEffect, useCallback, memo } from 'react';
import api from '../api/axios';
import { Bell, CheckCheck } from 'lucide-react';

const AdminNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterRead, setFilterRead] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterType) params.type = filterType;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterRead) params.isRead = filterRead;
      const [notiRes, unreadRes] = await Promise.allSettled([
        api.get('/admin/notifications', { params }),
        api.get('/admin/notifications/unread'),
      ]);
      if (notiRes.status === 'fulfilled') {
        setNotifications(notiRes.value.data.notifications || []);
        setTotal(notiRes.value.data.total || 0);
      }
      if (unreadRes.status === 'fulfilled') setUnreadCount(unreadRes.value.data.count || 0);
    } catch { /* silent */ }
    setLoading(false);
  }, [page, filterType, filterSeverity, filterRead]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.put(`/admin/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/admin/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const severityColor = (s) => {
    switch (s) {
      case 'critical': return { bg: 'var(--danger-bg)', text: 'var(--danger-text)', border: 'var(--danger-border)' };
      case 'high': return { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)' };
      case 'medium': return { bg: 'var(--info-bg)', text: 'var(--info-text)', border: 'var(--info-border)' };
      default: return { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)', border: 'var(--border-base)' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={24} style={{ color: 'var(--accent-text)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{unreadCount} unread</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }} aria-label="Mark all as read">
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by type">
          <option value="">All Types</option>
          <option value="booking">Booking</option>
          <option value="payment">Payment</option>
          <option value="user">User</option>
          <option value="system">System</option>
          <option value="fraud">Fraud</option>
        </select>
        <select value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by severity">
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterRead} onChange={e => { setFilterRead(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by read status">
          <option value="">All Status</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`glass rounded-xl p-4 border flex items-start gap-3 transition-all ${!n.isRead ? 'border-l-2' : ''}`}
              style={{ borderColor: !n.isRead ? 'var(--accent-border)' : 'var(--border-base)' }}>
              <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: severityColor(n.severity).text }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={severityColor(n.severity)}>{n.severity}</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{n.type}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead(n._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition-all hover:opacity-80" style={{ borderColor: 'var(--border-base)', color: 'var(--accent-text)' }} aria-label="Mark as read">
                  Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Prev</button>
          <span className="text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Next</button>
        </div>
      )}
    </div>
  );
};

export default memo(AdminNotificationsPage);
