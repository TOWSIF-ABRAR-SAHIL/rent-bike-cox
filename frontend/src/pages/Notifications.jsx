import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Bell, Check, CheckCheck } from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications?limit=50');
        setNotifications(data.notifications);
        setUnread(data.unread);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{unread} unread</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }} aria-label="Mark all notifications as read" >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
            <Bell size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No notifications</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n._id}
                className="flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer"
                style={{ background: n.read ? 'var(--bg-card)' : 'var(--accent-bg)', border: '1px solid var(--border-base)' }}
                onClick={() => !n.read && markRead(n._id)}
              >
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: n.read ? 'transparent' : typeColors[n.type] || 'var(--text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--input-bg)', color: typeColors[n.type] || 'var(--text-muted)' }}>
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.read && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(n._id); }} className="p-1 rounded" style={{ color: 'var(--accent-text)' }} aria-label="Mark as read">
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
