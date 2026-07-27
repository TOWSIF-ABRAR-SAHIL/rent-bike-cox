import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Bell, Check, CheckCheck } from 'lucide-react';

const NotificationBell = () => {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get('/notifications/unread');
      setUnread(data.unread);
    } catch {
      setUnread(0);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications?limit=10');
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  const typeColors = {
    booking: 'var(--accent-text)',
    payment: 'var(--success-text)',
    maintenance: 'var(--warning-text)',
    system: 'var(--info-text)',
    promotion: 'var(--purple-text)',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-all"
        style={{ color: 'var(--text-secondary)' }}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--danger-text)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl overflow-hidden z-[100] animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-base)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-text)' }} aria-label="Mark all as read">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className="px-4 py-3 flex items-start gap-3 transition-all cursor-pointer"
                  style={{ background: n.read ? 'transparent' : 'var(--hover-bg)' }}
                  onClick={() => !n.read && markRead(n._id)}
                  role="button"
                  tabIndex={0}
                  aria-label={n.read ? `${n.title} - ${n.message}` : `Mark "${n.title}" as read`}
                  onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !n.read) markRead(n._id); }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? 'transparent' : typeColors[n.type] || 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && <Check size={12} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 4 }} />}
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid var(--border-base)' }}>
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium" style={{ color: 'var(--accent-text)' }} aria-label="View all notifications">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
