import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { FileText, Save, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

const PAGE_GROUPS = [
  { label: 'Home Page', keys: ['home.hero.title', 'home.hero.subtitle', 'home.hero.cta', 'home.features.title', 'home.features.subtitle', 'home.steps.title', 'home.testimonials.title', 'home.zones.title'] },
  { label: 'Footer', keys: ['footer.tagline', 'footer.description', 'footer.copyright'] },
  { label: '404 Page', keys: ['notFound.title', 'notFound.message'] },
  { label: 'Policies', keys: ['policies.title', 'policies.description'] },
  { label: 'Signup', keys: ['signup.title', 'signup.subtitle'] },
  { label: 'Checkout', keys: ['checkout.title', 'checkout.subtitle'] },
  { label: 'FAQ', keys: ['faq.title', 'faq.subtitle'] },
  { label: 'Contact', keys: ['contact.title', 'contact.subtitle'] },
  { label: 'Global', keys: ['global.siteName', 'global.siteTagline'] },
];

const ContentEditor = () => {
  const { addToast } = useToast();
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState({ 'Home Page': true });

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/content');
      const map = {};
      res.data.forEach(item => { map[item.key] = item.value; });
      setContent(map);
    } catch {
      addToast('Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContent(); }, [fetchContent]);

  const handleSave = async (key) => {
    setSaving(key);
    try {
      await api.put(`/admin/content/${key}`, { value: content[key] || '' });
      addToast(`${key} updated`, 'success');
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleRollback = async (key) => {
    try {
      await api.post(`/admin/content/${key}/rollback`);
      addToast('Rolled back to previous version', 'success');
      fetchContent();
    } catch {
      addToast('Rollback failed', 'error');
    }
  };

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Site Content Editor</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Edit text content across your site. Changes are saved per key.</p>
      </div>

      {PAGE_GROUPS.map(group => (
        <div key={group.label} className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-base)' }}>
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
            className="w-full flex items-center justify-between p-4 text-left transition-colors"
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            aria-label={`Toggle ${group.label} section`}
          >
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{group.label}</span>
            {expanded[group.label] ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
          </button>

          {expanded[group.label] && (
            <div className="p-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
              {group.keys.map(key => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{key.split('.').pop()}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={content[key] || ''}
                      onChange={e => setContent(prev => ({ ...prev, [key]: e.target.value }))}
                      className="input-dark flex-1 text-sm"
                      placeholder={key}
                      aria-label={`Content value for ${key}`}
                    />
                    <button onClick={() => handleSave(key)} disabled={saving === key}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', borderColor: 'var(--accent-border)', opacity: saving === key ? 0.5 : 1 }}
                      aria-label={`Save ${key}`}>
                      {saving === key ? '...' : <Save size={14} />}
                    </button>
                    <button onClick={() => handleRollback(key)}
                      className="px-3 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}
                      aria-label={`Rollback ${key}`}>
                      <RotateCcw size={14} />
                    </button>
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

export default ContentEditor;
