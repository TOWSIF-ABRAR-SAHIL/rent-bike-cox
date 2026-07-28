import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Reply, Inbox, BarChart3, UserPlus } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'open', 'inProgress', 'waitingReply', 'resolved', 'closed'];
const CATEGORY_OPTIONS = ['general', 'booking', 'payment', 'technical', 'complaint', 'suggestion', 'partnership', 'emergency', 'other'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const PRIORITY_STYLE = {
  low: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
  medium: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  high: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  urgent: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

const STATUS_COLOR = {
  new: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  open: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  inProgress: { bg: 'var(--accent-bg)', text: 'var(--accent-text)' },
  waitingReply: { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  resolved: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  closed: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
};

const MessageInbox = () => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [assignInput, setAssignInput] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterPriority) params.priority = filterPriority;
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
  }, [page, filterStatus, filterCategory, filterPriority, addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/messages/stats');
      setStats(res.data);
      setShowStats(true);
    } catch { addToast('Failed to load stats', 'error'); }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status: 'open' } : m));
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
    } catch { addToast('Failed', 'error'); }
  };

  const updatePriority = async (id, priority) => {
    try {
      await api.put(`/admin/messages/${id}/priority`, { priority });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, priority } : m));
      if (selected?._id === id) setSelected(prev => ({ ...prev, priority }));
      addToast('Priority updated', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const assignMessage = async (id) => {
    if (!assignInput.trim()) return;
    try {
      await api.put(`/admin/messages/${id}/assign`, { assignedTo: assignInput.trim() });
      addToast('Assigned!', 'success');
      setAssignInput('');
      fetchMessages();
    } catch { addToast('Failed to assign', 'error'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '';
  const formatShortDate = (d) => d ? new Date(d).toLocaleDateString() : '';

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Inbox size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Messages</h3>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>{unreadCount} unread</span>
            )}
            <button onClick={fetchStats} className="px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="View stats">
              <BarChart3 size={12} /> Stats
            </button>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Contact form submissions from users. Tickets auto-escalate after 4h (high) / 24h (urgent).</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by status">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by category">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} className="input-dark text-sm !py-2" aria-label="Filter by priority">
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {msg.status === 'new' && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{msg.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&lt;{msg.email}&gt;</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={STATUS_COLOR[msg.status] || STATUS_COLOR.new}>{msg.status}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={PRIORITY_STYLE[msg.priority] || PRIORITY_STYLE.medium}>{msg.priority}</span>
                    <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{msg.category}</span>
                    {msg.ticketId && <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{msg.ticketId}</span>}
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{msg.subject || '(No subject)'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{msg.message}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatShortDate(msg.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {total > 15 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Prev</button>
          <span className="text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 15)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Next</button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => { setSelected(null); setReplyText(''); }}>
          <div className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto border" style={{ borderColor: 'var(--border-base)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Message from {selected.name}</h3>
                {selected.ticketId && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{selected.ticketId}</p>}
              </div>
              <button onClick={() => { setSelected(null); setReplyText(''); }} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }} aria-label="Close">✕</button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium" style={STATUS_COLOR[selected.status] || STATUS_COLOR.new}>{selected.status}</span>
                <span className="px-2 py-1 rounded text-xs font-medium" style={PRIORITY_STYLE[selected.priority] || PRIORITY_STYLE.medium}>{selected.priority}</span>
                <span className="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{selected.category}</span>
              </div>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>From:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.name} &lt;{selected.email}&gt;</span></p>
              {selected.phone && <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.phone}</span></p>}
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ color: 'var(--text-primary)' }}>{formatDate(selected.createdAt)}</span></p>
              {selected.subject && <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Subject:</span> <span style={{ color: 'var(--text-primary)' }}>{selected.subject}</span></p>}
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {(selected.conversation || [selected]).map((entry, i) => {
                const isCustomer = entry.sender === 'customer';
                return (
                  <div key={i} className={`p-3 rounded-xl text-sm ${isCustomer ? '' : 'border ml-6'}`}
                    style={{
                      background: isCustomer ? 'var(--bg-tertiary)' : 'var(--success-bg)',
                      color: isCustomer ? 'var(--text-primary)' : 'var(--success-text)',
                      borderColor: isCustomer ? 'transparent' : 'var(--success-border)'
                    }}>
                    <p className="text-[10px] font-medium mb-1" style={{ color: isCustomer ? 'var(--text-muted)' : 'var(--success-text)' }}>
                      {isCustomer ? selected.name : 'Admin'} · {formatDate(entry.sentAt || selected.createdAt)}
                    </p>
                    {entry.message || entry.reply || entry}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>Status:</span>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => updateStatus(selected._id, s)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${selected.status === s ? 'opacity-100' : 'opacity-50'}`}
                  style={selected.status === s ? STATUS_COLOR[s] : { borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
                  aria-label={`Set status to ${s}`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>Priority:</span>
              {PRIORITY_OPTIONS.map(p => (
                <button key={p} onClick={() => updatePriority(selected._id, p)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${selected.priority === p ? 'opacity-100' : 'opacity-50'}`}
                  style={selected.priority === p ? PRIORITY_STYLE[p] : { borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
                  aria-label={`Set priority to ${p}`}>
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input type="text" value={assignInput} onChange={e => setAssignInput(e.target.value)} className="input-dark text-sm flex-1" placeholder="Admin ID or email to assign..." aria-label="Assign to" />
              <button onClick={() => assignMessage(selected._id)} disabled={!assignInput.trim()} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }} aria-label="Assign message">
                <UserPlus size={14} className="inline mr-1" /> Assign
              </button>
            </div>

            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} className="input-dark text-sm w-full mb-3" rows={3} placeholder="Type your reply..." aria-label="Reply message" />
            <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn-primary w-full text-sm flex items-center justify-center gap-2" aria-label="Send reply">
              <Reply size={14} /> {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}

      {showStats && stats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setShowStats(false)}>
          <div className="glass rounded-2xl p-6 max-w-lg w-full border" style={{ borderColor: 'var(--border-base)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Message Stats</h3>
              <button onClick={() => setShowStats(false)} className="p-1" style={{ color: 'var(--text-muted)' }} aria-label="Close">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--warning-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--warning-text)' }}>{stats.open}</p>
                <p className="text-[10px]" style={{ color: 'var(--warning-text)' }}>Open</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--success-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--success-text)' }}>{stats.closed}</p>
                <p className="text-[10px]" style={{ color: 'var(--success-text)' }}>Closed</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--danger-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--danger-text)' }}>{stats.escalated}</p>
                <p className="text-[10px]" style={{ color: 'var(--danger-text)' }}>Escalated</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Avg Response Time: <strong style={{ color: 'var(--text-primary)' }}>{stats.avgResponseTimeHours}h</strong></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>By Category</p>
                <div className="space-y-1">
                  {(stats.byCategory || []).map(c => (
                    <div key={c._id} className="flex justify-between text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{c._id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>By Priority</p>
                <div className="space-y-1">
                  {(stats.byPriority || []).map(p => (
                    <div key={p._id} className="flex justify-between text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{p._id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInbox;
