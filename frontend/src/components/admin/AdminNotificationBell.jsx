import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { Bell, Check, CheckCheck } from 'lucide-react';

const AdminNotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications/unread');
      setUnreadCount(res.data.count || 0);
    } catch { /* silent */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notifications/recent?limit=8');
      setNotifications(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!open) {
      fetchRecent();
    }
    setOpen(!open);
  };

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

  const severityIcon = (s) => {
    switch (s) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      default: return '🔵';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleOpen} className="relative p-2 rounded-xl transition-all" style={{ color: 'var(--text-secondary)' }} aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--danger-text)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl border shadow-xl z-[100] overflow-hidden" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-base)' }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs flex items-center gap-1 transition-all hover:opacity-80" style={{ color: 'var(--accent-text)' }} aria-label="Mark all as read">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
            ) : (
              notifications.map(n => (
                <div key={n._id} className={`flex items-start gap-3 p-3 border-b transition-colors ${!n.isRead ? 'bg-amber-500/5' : ''}`} style={{ borderColor: 'var(--border-base)' }}>
                  <span className="text-base shrink-0 mt-0.5">{severityIcon(n.severity)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => markRead(n._id)} className="p-1 rounded-lg shrink-0 transition-all hover:opacity-80" style={{ color: 'var(--accent-text)' }} aria-label="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t text-center" style={{ borderColor: 'var(--border-base)' }}>
            <a href="/admin-dashboard" onClick={() => setOpen(false)} className="text-xs font-medium" style={{ color: 'var(--accent-text)' }}>View All</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
