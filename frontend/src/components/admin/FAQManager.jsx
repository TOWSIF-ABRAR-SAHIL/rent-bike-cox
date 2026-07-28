import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { HelpCircle, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORIES = ['General', 'Booking', 'Payment', 'Vehicle', 'Account', 'Safety', 'Cancellation', 'Insurance'];

const FAQManager = () => {
  const { addToast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ question: '', answer: '', category: 'General' });
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});

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

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFaqs(); }, [fetchFaqs]);

  const handleCreate = async () => {
    try {
      await api.post('/admin/faqs', form);
      addToast('FAQ created!', 'success');
      setForm({ question: '', answer: '', category: 'General' });
      fetchFaqs();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/admin/faqs/${editing._id}`, form);
      addToast('FAQ updated!', 'success');
      setEditing(null);
      setForm({ question: '', answer: '', category: 'General' });
      fetchFaqs();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
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
    setForm({ question: faq.question, answer: faq.answer, category: faq.category });
  };

  const grouped = {};
  faqs.forEach(f => {
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
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Manage frequently asked questions. Organized by category.</p>

        <div className="space-y-3">
          <input type="text" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="input-dark text-sm w-full" placeholder="Question" aria-label="FAQ question" />
          <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} className="input-dark text-sm w-full" rows={3} placeholder="Answer" aria-label="FAQ answer" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-dark text-sm w-full" aria-label="FAQ category">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.question || !form.answer} className="btn-primary flex-1 text-sm" aria-label={editing ? 'Update FAQ' : 'Add FAQ'}>
              {editing ? 'Update' : 'Add FAQ'}
            </button>
            {editing && <button onClick={() => { setEditing(null); setForm({ question: '', answer: '', category: 'General' }); }} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>Cancel</button>}
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
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
                <div key={faq._id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-base)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{faq.question}</p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{faq.answer}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Helpful: {faq.helpfulCount || 0} · Not: {faq.notHelpfulCount || 0}</p>
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
      ))}
    </div>
  );
};

export default FAQManager;
