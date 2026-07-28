import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { HelpCircle, Trash2, ChevronDown, ChevronRight, Search, Pin, X, Save } from 'lucide-react';

const CATEGORIES = ['General', 'Booking', 'Payment', 'Vehicle', 'Account', 'Safety', 'Cancellation', 'Insurance', 'Damages'];

const FAQManager = () => {
  const { addToast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ question: '', answer: '', category: 'General', tags: '', isPinned: false });
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/faqs');
      setFaqs(res.data);
      const cats = {};
      res.data.forEach(f => { cats[f.category] = true; });
      setExpanded(cats);
    } catch {
      addToast('Failed to load FAQs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/admin/faqs', {
        question: form.question, answer: form.answer, category: form.category,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isPinned: form.isPinned
      });
      addToast('FAQ created!', 'success');
      setForm({ question: '', answer: '', category: 'General', tags: '', isPinned: false });
      fetchFaqs();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/faqs/${editing._id}`, {
        question: form.question, answer: form.answer, category: form.category,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isPinned: form.isPinned
      });
      addToast('FAQ updated!', 'success');
      setEditing(null);
      setForm({ question: '', answer: '', category: 'General', tags: '', isPinned: false });
      fetchFaqs();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await api.delete(`/admin/faqs/${id}`);
      addToast('Deleted', 'success');
      fetchFaqs();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const openEdit = (faq) => {
    setEditing(faq);
    setForm({
      question: faq.question, answer: faq.answer, category: faq.category,
      tags: (faq.tags || []).join(', '),
      isPinned: faq.isPinned || false
    });
  };

  const filtered = searchQuery.trim()
    ? faqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : faqs;

  const pinned = filtered.filter(f => f.isPinned);
  const unpinned = filtered.filter(f => !f.isPinned);

  const grouped = {};
  [...pinned, ...unpinned].forEach(f => {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  });

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>FAQ Management</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Manage frequently asked questions. Pinned FAQs appear first.</p>

        <div className="space-y-3">
          <input type="text" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="input-dark text-sm w-full" placeholder="Question" aria-label="FAQ question" />
          <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} className="input-dark text-sm w-full" rows={3} placeholder="Answer" aria-label="FAQ answer" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-dark text-sm" aria-label="FAQ category">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input-dark text-sm" placeholder="Tags (comma-separated)" aria-label="Tags" />
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })} className="rounded" />
              <Pin size={14} /> Pinned
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.question || !form.answer || saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1" aria-label={editing ? 'Update FAQ' : 'Add FAQ'}>
              <Save size={14} /> {saving ? 'Saving...' : (editing ? 'Update' : 'Add FAQ')}
            </button>
            {editing && <button onClick={() => { setEditing(null); setForm({ question: '', answer: '', category: 'General', tags: '', isPinned: false }); }} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-dark text-sm w-full pl-9" placeholder="Search FAQs..." aria-label="Search FAQs" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No FAQs found{searchQuery ? ' matching your search' : ''}</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-base)' }}>
            <button onClick={() => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              aria-label={`Toggle ${cat} category`}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cat} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({items.length})</span></span>
              {expanded[cat] ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {expanded[cat] && (
              <div className="p-4 pt-0 space-y-2 border-t" style={{ borderColor: 'var(--border-base)' }}>
                {items.map(faq => (
                  <div key={faq._id} className={`p-3 rounded-xl border transition-all ${faq.isPinned ? 'ring-1' : ''}`}
                    style={{ borderColor: faq.isPinned ? 'var(--accent-border)' : 'var(--border-base)', background: faq.isPinned ? 'var(--accent-bg)' : '' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{faq.question}</p>
                          {faq.isPinned && <Pin size={12} style={{ color: 'var(--accent-text)' }} />}
                        </div>
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{faq.answer}</p>
                        {faq.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {faq.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t}</span>)}
                          </div>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Helpful: {faq.helpfulCount || 0} · Not: {faq.notHelpfulCount || 0}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(faq)} className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Edit FAQ">Edit</button>
                        <button onClick={() => handleDelete(faq._id)} className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }} aria-label="Delete FAQ"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default FAQManager;
