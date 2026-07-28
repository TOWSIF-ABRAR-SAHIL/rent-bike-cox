import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Megaphone, Trash2, BarChart3 } from 'lucide-react';

const TYPES = ['banner', 'popup', 'notice', 'toast', 'maintenance'];
const POSITIONS = ['top', 'bottom', 'center'];
const PAGES_OPTIONS = ['all', 'home', 'search', 'checkout', 'profile', 'admin'];
const FREQUENCY_OPTIONS = ['always', 'once', 'daily', 'weekly'];

const AnnouncementManager = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', message: '', type: 'banner', position: 'top', pages: ['all'],
    audience: 'all', isActive: true, isDismissible: true, priority: 10,
    style: { bgColor: '#f59e0b', textColor: '#000000', borderColor: '', icon: '' },
    schedule: { startDate: '', endDate: '', showOnce: false, frequency: 'always' },
    actions: { ctaText: '', ctaUrl: '', ctaNewTab: false },
  });
  const [editing, setEditing] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/announcements');
      setItems(res.data);
    } catch {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setForm({
      title: '', message: '', type: 'banner', position: 'top', pages: ['all'],
      audience: 'all', isActive: true, isDismissible: true, priority: 10,
      style: { bgColor: '#f59e0b', textColor: '#000000', borderColor: '', icon: '' },
      schedule: { startDate: '', endDate: '', showOnce: false, frequency: 'always' },
      actions: { ctaText: '', ctaUrl: '', ctaNewTab: false },
    });
  };

  const handleCreate = async () => {
    try {
      const payload = { ...form };
      payload.schedule = {
        ...form.schedule,
        startDate: form.schedule.startDate ? new Date(form.schedule.startDate) : new Date(),
        endDate: form.schedule.endDate ? new Date(form.schedule.endDate) : null,
      };
      await api.post('/admin/announcements', payload);
      addToast('Announcement created!', 'success');
      resetForm();
      fetchItems();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = { ...form };
      payload.schedule = {
        ...form.schedule,
        startDate: form.schedule.startDate ? new Date(form.schedule.startDate) : new Date(),
        endDate: form.schedule.endDate ? new Date(form.schedule.endDate) : null,
      };
      await api.put(`/admin/announcements/${editing._id}`, payload);
      addToast('Announcement updated!', 'success');
      setEditing(null);
      resetForm();
      fetchItems();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      addToast('Deleted', 'success');
      fetchItems();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title, message: item.message, type: item.type, position: item.position,
      pages: item.pages || ['all'], audience: item.audience,
      isActive: item.isActive, isDismissible: item.isDismissible !== false, priority: item.priority || 10,
      style: {
        bgColor: item.style?.bgColor || '#f59e0b', textColor: item.style?.textColor || '#000000',
        borderColor: item.style?.borderColor || '', icon: item.style?.icon || '',
      },
      schedule: {
        startDate: item.schedule?.startDate ? item.schedule.startDate.split('T')[0] : '',
        endDate: item.schedule?.endDate ? item.schedule.endDate.split('T')[0] : '',
        showOnce: item.schedule?.showOnce || false, frequency: item.schedule?.frequency || 'always',
      },
      actions: {
        ctaText: item.actions?.ctaText || '', ctaUrl: item.actions?.ctaUrl || '',
        ctaNewTab: item.actions?.ctaNewTab || false,
      },
    });
  };

  const togglePage = (page) => {
    setForm(prev => {
      const pages = prev.pages.includes(page) ? prev.pages.filter(p => p !== page) : [...prev.pages, page];
      return { ...prev, pages: pages.length === 0 ? ['all'] : pages };
    });
  };

  const activeCount = items.filter(i => i.isActive).length;

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Megaphone size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: activeCount > 0 ? 'var(--success-bg)' : 'var(--bg-tertiary)', color: activeCount > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
            {activeCount} active
          </span>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create banners, popups, notices, and maintenance alerts.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark text-sm" placeholder="Title" aria-label="Title" />
            <input type="text" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="input-dark text-sm" placeholder="Message" aria-label="Message" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-dark text-sm" aria-label="Type">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="input-dark text-sm" aria-label="Position">
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} className="input-dark text-sm" aria-label="Audience">
              <option value="all">All Users</option>
              <option value="guests">Guests Only</option>
              <option value="users">Registered</option>
              <option value="renters">Renters</option>
            </select>
            <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 10 })} className="input-dark text-sm" placeholder="Priority" aria-label="Priority" />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Pages</p>
            <div className="flex flex-wrap gap-2">
              {PAGES_OPTIONS.map(page => (
                <button key={page} onClick={() => togglePage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.pages.includes(page) ? '' : 'opacity-50'}`}
                  style={form.pages.includes(page) ? { background: 'var(--accent-bg)', color: 'var(--accent-text)', borderColor: 'var(--accent-border)' } : { borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
                  aria-label={`Toggle page ${page}`}>
                  {page}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Schedule</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.schedule.startDate} onChange={e => setForm({ ...form, schedule: { ...form.schedule, startDate: e.target.value } })} className="input-dark text-sm" aria-label="Start date" />
                <input type="date" value={form.schedule.endDate} onChange={e => setForm({ ...form, schedule: { ...form.schedule, endDate: e.target.value } })} className="input-dark text-sm" aria-label="End date" />
              </div>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.schedule.showOnce} onChange={e => setForm({ ...form, schedule: { ...form.schedule, showOnce: e.target.checked } })} className="rounded" />
                  Show once
                </label>
                <select value={form.schedule.frequency} onChange={e => setForm({ ...form, schedule: { ...form.schedule, frequency: e.target.value } })} className="input-dark text-xs !py-1" aria-label="Frequency">
                  {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>CTA Action</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.actions.ctaText} onChange={e => setForm({ ...form, actions: { ...form.actions, ctaText: e.target.value } })} className="input-dark text-sm" placeholder="Button text" aria-label="CTA text" />
                <input type="url" value={form.actions.ctaUrl} onChange={e => setForm({ ...form, actions: { ...form.actions, ctaUrl: e.target.value } })} className="input-dark text-sm" placeholder="https://..." aria-label="CTA URL" />
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer mt-2" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.actions.ctaNewTab} onChange={e => setForm({ ...form, actions: { ...form.actions, ctaNewTab: e.target.checked } })} className="rounded" />
                Open in new tab
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>BG Color</label>
              <input type="color" value={form.style.bgColor} onChange={e => setForm({ ...form, style: { ...form.style, bgColor: e.target.value } })} className="w-full h-9 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>Text Color</label>
              <input type="color" value={form.style.textColor} onChange={e => setForm({ ...form, style: { ...form.style, textColor: e.target.value } })} className="w-full h-9 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>Border Color</label>
              <input type="color" value={form.style.borderColor || '#000000'} onChange={e => setForm({ ...form, style: { ...form.style, borderColor: e.target.value } })} className="w-full h-9 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
              <input type="text" value={form.style.icon} onChange={e => setForm({ ...form, style: { ...form.style, icon: e.target.value } })} className="input-dark text-sm" placeholder="e.g. 🚗" aria-label="Icon emoji" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isDismissible} onChange={e => setForm({ ...form, isDismissible: e.target.checked })} className="rounded" />
              Dismissible
            </label>
          </div>

          <div className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: form.style.bgColor, background: `${form.style.bgColor}15` }}>
            <span style={{ fontSize: '1.5rem' }}>{form.style.icon || '📢'}</span>
            <div>
              <p className="text-sm font-medium" style={{ color: form.style.textColor }}>{form.title || 'Preview Title'}</p>
              <p className="text-xs" style={{ color: form.style.textColor, opacity: 0.8 }}>{form.message || 'Preview message text'}</p>
              {form.actions.ctaText && <span className="text-xs font-medium mt-1 inline-block" style={{ color: form.style.textColor, textDecoration: 'underline' }}>{form.actions.ctaText}</span>}
            </div>
          </div>

          <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.title || !form.message} className="btn-primary w-full text-sm" aria-label={editing ? 'Update' : 'Create'}>
            {editing ? 'Update Announcement' : 'Create Announcement'}
          </button>
          {editing && <button onClick={() => { setEditing(null); resetForm(); }} className="w-full py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>Cancel Edit</button>}
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item._id} className="glass rounded-xl p-4 border flex items-start justify-between gap-3" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `${item.style?.bgColor || '#f59e0b'}30`, color: item.style?.bgColor || '#f59e0b' }}>{item.type}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.pages?.join(', ')}</span>
                <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {item.schedule?.frequency !== 'always' && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.schedule.frequency}</span>}
              </div>
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.style?.icon ? `${item.style.icon} ` : ''}{item.title}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.message}</p>
              <div className="flex gap-3 text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>Views: {item.analytics?.impressions || 0}</span>
                <span>Clicks: {item.analytics?.clicks || 0}</span>
                <span>Dismissals: {item.analytics?.dismissals || 0}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(item)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Edit">Edit</button>
              <button onClick={() => setShowAnalytics(showAnalytics === item._id ? null : item._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="View analytics">
                <BarChart3 size={12} />
              </button>
              <button onClick={() => handleDelete(item._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }} aria-label="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No announcements yet</p>}
      </div>
    </div>
  );
};

export default AnnouncementManager;
