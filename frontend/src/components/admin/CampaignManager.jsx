import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Send, BarChart3, Plus, Trash2, X, PauseCircle, PlayCircle, Clock } from 'lucide-react';

const AUDIENCE_OPTIONS = ['all', 'users', 'renters', 'admins'];

const CampaignManager = () => {
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body: '', audience: 'all', scheduledAt: '', timezone: 'Asia/Dhaka', batchSize: 50, batchDelay: 5000 });
  const [editing, setEditing] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [sending, setSending] = useState(null);
  const [audienceCount, setAudienceCount] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch {
      addToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreate = async () => {
    try {
      const payload = { name: form.name, subject: form.subject, body: form.body, audience: { filter: form.audience } };
      if (form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      await api.post('/admin/campaigns', payload);
      addToast('Campaign created!', 'success');
      setForm({ name: '', subject: '', body: '', audience: 'all', scheduledAt: '', timezone: 'Asia/Dhaka', batchSize: 50, batchDelay: 5000 });
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = { name: form.name, subject: form.subject, body: form.body, audience: { filter: form.audience } };
      if (form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      await api.put(`/admin/campaigns/${editing._id}`, payload);
      addToast('Campaign updated!', 'success');
      setEditing(null);
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/admin/campaigns/${id}`);
      addToast('Deleted', 'success');
      fetchCampaigns();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Send this campaign now?')) return;
    setSending(id);
    try {
      await api.post(`/admin/campaigns/${id}/send`);
      addToast('Campaign queued!', 'success');
      fetchCampaigns();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send', 'error');
    } finally {
      setSending(null);
    }
  };

  const handlePause = async (id) => {
    try {
      await api.put(`/admin/campaigns/${id}`, { status: 'paused' });
      addToast('Campaign paused', 'success');
      fetchCampaigns();
    } catch { addToast('Failed', 'error'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this campaign?')) return;
    try {
      await api.put(`/admin/campaigns/${id}`, { status: 'cancelled' });
      addToast('Campaign cancelled', 'success');
      fetchCampaigns();
    } catch { addToast('Failed', 'error'); }
  };

  const previewAudience = async () => {
    try {
      const res = await api.post('/admin/campaigns/preview-audience', { filter: form.audience });
      setAudienceCount(res.data.count);
    } catch {
      setAudienceCount(null);
    }
  };

  const viewAnalytics = async (id) => {
    try {
      const res = await api.get(`/admin/campaigns/${id}/analytics`);
      setAnalytics(res.data);
    } catch {
      addToast('Failed to load analytics', 'error');
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, subject: c.subject, body: c.body,
      audience: c.audience?.filter || 'all',
      scheduledAt: c.scheduledAt ? c.scheduledAt.split('.')[0] : '',
      timezone: c.scheduling?.timezone || 'Asia/Dhaka',
      batchSize: c.batchSize || 50,
      batchDelay: c.batchDelay || 5000,
    });
    setShowForm(true);
  };

  const statusStyle = (s) => {
    switch (s) {
      case 'sent': return { bg: 'var(--success-bg)', text: 'var(--success-text)' };
      case 'sending': return { bg: 'var(--info-bg)', text: 'var(--info-text)' };
      case 'scheduled': return { bg: 'var(--purple-bg)', text: 'var(--purple-text)' };
      case 'paused': return { bg: 'var(--warning-bg)', text: 'var(--warning-text)' };
      case 'failed': return { bg: 'var(--danger-bg)', text: 'var(--danger-text)' };
      case 'cancelled': return { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' };
      default: return { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' };
    }
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Send size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Email Campaigns</h3>
          </div>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', subject: '', body: '', audience: 'all', scheduledAt: '', timezone: 'Asia/Dhaka', batchSize: 50, batchDelay: 5000 }); setAudienceCount(null); }} className="btn-primary text-sm flex items-center gap-1" aria-label="New campaign">
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-6 border space-y-3" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit Campaign' : 'New Campaign'}</h4>
            <button onClick={() => { setShowForm(false); setEditing(null); }} aria-label="Close"><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dark text-sm w-full" placeholder="Campaign name" aria-label="Campaign name" />
          <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input-dark text-sm w-full" placeholder="Email subject" aria-label="Email subject" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input-dark text-sm w-full" rows={6} placeholder="Email body (HTML supported)" aria-label="Email body" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Audience</label>
              <div className="flex gap-2">
                <select value={form.audience} onChange={e => { setForm({ ...form, audience: e.target.value }); setAudienceCount(null); }} className="input-dark text-sm flex-1" aria-label="Audience">
                  {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
                </select>
                <button onClick={previewAudience} className="px-3 py-2 rounded-xl text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Count</button>
              </div>
              {audienceCount !== null && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Will send to <strong style={{ color: 'var(--accent-text)' }}>{audienceCount}</strong> recipients</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="input-dark text-sm w-full" aria-label="Schedule date" />
            </div>
          </div>
          <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.name || !form.subject || !form.body} className="btn-primary w-full text-sm" aria-label="Save campaign">
            {editing ? 'Update' : 'Create Campaign'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map(c => {
          const total = c.progress?.total || c.sentCount + c.failedCount || 0;
          const sent = c.progress?.sent || c.sentCount || 0;
          const failed = c.progress?.failed || c.failedCount || 0;
          return (
            <div key={c._id} className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={statusStyle(c.status)}>{c.status}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.audience?.filter}</span>
                    {c.scheduling?.sendAt && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={10} /> {new Date(c.scheduling.sendAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Subject: {c.subject}</p>
                  {c.sentAt && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Sent: {new Date(c.sentAt).toLocaleString()}</p>}
                  {(total > 0 || c.status === 'sending' || c.status === 'sent') && (
                    <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span>Sent: <strong style={{ color: 'var(--success-text)' }}>{sent}</strong></span>
                      <span>Failed: <strong style={{ color: 'var(--danger-text)' }}>{failed}</strong></span>
                      {c.progress?.bounced > 0 && <span>Bounced: <strong style={{ color: 'var(--warning-text)' }}>{c.progress.bounced}</strong></span>}
                      {c.progress?.opened > 0 && <span>Opened: <strong style={{ color: 'var(--info-text)' }}>{c.progress.opened}</strong></span>}
                      {c.progress?.clicked > 0 && <span>Clicked: <strong style={{ color: 'var(--accent-text)' }}>{c.progress.clicked}</strong></span>}
                    </div>
                  )}
                  {c.status === 'sending' && (
                    <div className="mt-2 w-full h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${total > 0 ? Math.round((sent / total) * 100) : 0}%`, background: 'var(--accent-text)' }} />
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  {c.status === 'draft' && (
                    <button onClick={() => handleSend(c._id)} disabled={sending === c._id} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }} aria-label="Send campaign">
                      <Send size={12} className="inline mr-1" />{sending === c._id ? '...' : 'Send'}
                    </button>
                  )}
                  {c.status === 'sending' && (
                    <button onClick={() => handlePause(c._id)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }} aria-label="Pause campaign">
                      <PauseCircle size={12} className="inline mr-1" />Pause
                    </button>
                  )}
                  {c.status === 'paused' && (
                    <button onClick={() => handleSend(c._id)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }} aria-label="Resume campaign">
                      <PlayCircle size={12} className="inline mr-1" />Resume
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'paused') && (
                    <button onClick={() => openEdit(c)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Edit campaign">Edit</button>
                  )}
                  {c.status !== 'sent' && c.status !== 'sending' && (
                    <button onClick={() => handleCancel(c._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }} aria-label="Cancel campaign"><X size={12} /></button>
                  )}
                  {c.status === 'sent' && (
                    <button onClick={() => viewAnalytics(c._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="View analytics"><BarChart3 size={12} /></button>
                  )}
                  <button onClick={() => handleDelete(c._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }} aria-label="Delete campaign"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No campaigns yet</p>}
      </div>

      {analytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setAnalytics(null)}>
          <div className="glass rounded-2xl p-6 max-w-md w-full border" style={{ borderColor: 'var(--border-base)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{analytics.name} - Analytics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>{analytics.sentCount || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sent</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--success-text)' }}>{analytics.openCount || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Opened</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--info-text)' }}>{analytics.clickCount || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clicked</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--danger-text)' }}>{analytics.failedCount || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Failed</p>
              </div>
            </div>
            <button onClick={() => setAnalytics(null)} className="mt-4 w-full py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
