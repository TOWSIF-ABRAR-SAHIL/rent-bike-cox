import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Reply, Inbox } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'read', 'replied', 'archived'];
const CATEGORY_OPTIONS = ['general', 'booking', 'payment', 'technical', 'complaint', 'suggestion', 'other'];

const MessageInbox = () => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const [msgRes, unreadRes] = await Promise.allSettled([
        api.get('/admin/messages', { params }),
        api.get('/admin/messages/unread'),
      ]);
      if (msgRes.status === 'fulfilled') {
        setMessages(msgRes.value.data.messages || []);
        setTotal(msgRes.value.data.total || 0);
      }
      if (unreadRes.status === 'fulfilled') setUnreadCount(unreadRes.value.data.count || 0);
    } catch {
      addToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory, addToast]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMessages(); }, [fetchMessages]);

  const markRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status: 'read' } : m));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    if (msg.status === 'new') markRead(msg._id);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/messages/${selected._id}/reply`, { reply: replyText });
      addToast('Reply sent!', 'success');
      setReplyText('');
      setSelected(null);
      fetchMessages();
    } catch {
      addToast('Failed to send reply', 'error');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/messages/${id}/status`, { status });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status } : m));
      if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
      addToast('Status updated', 'success');
    } catch {
      addToast('Failed', 'error');
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case 'new': return { bg: 'var(--info-bg)', text: 'var(--info-text)', border: 'var(--info-border)' };
      case 'read': return { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)' };
      case 'replied': return { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'var(--success-border)' };
      default: return { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)', border: 'var(--border-base)' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Inbox size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Messages</h3>
          </div>
          {unreadCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>{unreadCount} unread</span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Contact form submissions from users.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by status">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by category">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Message List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : messages.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No messages found</p>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <button key={msg._id} onClick={() => openMessage(msg)}
              className="w-full text-left glass rounded-xl p-4 border transition-all hover:opacity-90"
              style={{ borderColor: msg.status === 'new' ? 'var(--accent-border)' : 'var(--border-base)' }}
              aria-label={`Message from ${msg.name}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.status === 'new' && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{msg.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&lt;{msg.email}&gt;</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={statusColor(msg.status)}>{msg.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{msg.category}</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{msg.subject || '(No subject)'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{msg.message}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{new Date(msg.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 15 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Prev</button>
          <span className="text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 15)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Next</button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => { setSelected(null); setReplyText(''); }}>
          <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border" style={{ borderColor: 'var(--border-base)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Message from {selected.name}</h3>
              <button onClick={() => { setSelected(null); setReplyText(''); }} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }} aria-label="Close">✕</button>
            </div>
            <div className="space-y-3 mb-4">
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Email:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.email}</span></p>
              {selected.phone && <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.phone}</span></p>}
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Category:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.category}</span></p>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(selected.createdAt).toLocaleString()}</span></p>
              {selected.subject && <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Subject:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.subject}</span></p>}
              <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{selected.message}</div>
              {selected.adminReply && (
                <div className="p-3 rounded-xl text-sm border" style={{ borderColor: 'var(--success-border)', background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  <p className="text-xs font-medium mb-1">Admin Reply:</p>
                  {selected.adminReply}
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <span className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>Status:</span>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => updateStatus(selected._id, s)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${selected.status === s ? 'opacity-100' : 'opacity-50'}`}
                  style={selected.status === s ? statusColor(s) : { borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
                  aria-label={`Set status to ${s}`}>
                  {s}
                </button>
              ))}
            </div>

            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} className="input-dark text-sm w-full mb-3" rows={3} placeholder="Type your reply..." aria-label="Reply message" />
            <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn-primary w-full text-sm flex items-center justify-center gap-2" aria-label="Send reply">
              <Reply size={14} /> {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInbox;
