import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Megaphone, Trash2 } from 'lucide-react';

const TYPES = ['banner', 'popup', 'notice', 'toast'];
const POSITIONS = ['top', 'bottom', 'center'];
const PAGES_OPTIONS = ['all', 'home', 'search', 'checkout', 'profile', 'admin'];

const AnnouncementManager = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'banner', position: 'top', pages: ['all'], audience: 'all', isActive: true, isDismissible: true, bgColor: '#f59e0b', textColor: '#000000', priority: 10, startDate: '', endDate: '' });
  const [editing, setEditing] = useState(null);

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

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems(); }, [fetchItems]);

  const handleCreate = async () => {
    try {
      await api.post('/admin/announcements', form);
      addToast('Announcement created!', 'success');
      setForm({ title: '', message: '', type: 'banner', position: 'top', pages: ['all'], audience: 'all', isActive: true, isDismissible: true, bgColor: '#f59e0b', textColor: '#000000', priority: 10, startDate: '', endDate: '' });
      fetchItems();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/admin/announcements/${editing._id}`, form);
      addToast('Announcement updated!', 'success');
      setEditing(null);
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
    setForm({ title: item.title, message: item.message, type: item.type, position: item.position, pages: item.pages || ['all'], audience: item.audience, isActive: item.isActive, isDismissible: item.isDismissible, bgColor: item.bgColor || '#f59e0b', textColor: item.textColor || '#000000', priority: item.priority || 10, startDate: item.startDate ? item.startDate.split('T')[0] : '', endDate: item.endDate ? item.endDate.split('T')[0] : '' });
  };

  const togglePage = (page) => {
    setForm(prev => {
      const pages = prev.pages.includes(page) ? prev.pages.filter(p => p !== page) : [...prev.pages, page];
      return { ...prev, pages: pages.length === 0 ? ['all'] : pages };
    });
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Megaphone size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create banners, popups, and notices for your site visitors.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark text-sm" placeholder="Title" aria-label="Announcement title" />
            <input type="text" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="input-dark text-sm" placeholder="Message" aria-label="Announcement message" />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>BG Color</label>
              <input type="color" value={form.bgColor} onChange={e => setForm({ ...form, bgColor: e.target.value })} className="w-full h-9 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Text Color</label>
              <input type="color" value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })} className="w-full h-9 rounded cursor-pointer" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isDismissible} onChange={e => setForm({ ...form, isDismissible: e.target.checked })} className="rounded" />
              Dismissible
            </label>
          </div>
          <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.title || !form.message} className="btn-primary w-full text-sm" aria-label={editing ? 'Update announcement' : 'Create announcement'}>
            {editing ? 'Update' : 'Create Announcement'}
          </button>
          {editing && <button onClick={() => setEditing(null)} className="w-full py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>Cancel Edit</button>}
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item._id} className="glass rounded-xl p-4 border flex items-start justify-between gap-3" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${item.bgColor || '#f59e0b'}30`, color: item.bgColor || '#f59e0b' }}>{item.type}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.pages?.join(', ')}</span>
                <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`} aria-label={item.isActive ? 'Active' : 'Inactive'} />
              </div>
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.message}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Views: {item.viewCount || 0} · Clicks: {item.clickCount || 0}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(item)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Edit announcement">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="px-3 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }} aria-label="Delete announcement"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No announcements yet</p>}
      </div>
    </div>
  );
};

export default AnnouncementManager;
