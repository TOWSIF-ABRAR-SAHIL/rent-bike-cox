import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { FileText, Save, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';

const CHANNEL_CONFIG = [
  { key: 'email', label: 'Email', fields: ['subject', 'body'] },
  { key: 'inApp', label: 'In-App', fields: ['title', 'body'] },
  { key: 'sms', label: 'SMS', fields: ['message'] },
  { key: 'push', label: 'Push', fields: ['title', 'body'] },
];

const CATEGORY_COLORS = {
  auth: { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  booking: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  payment: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  vehicle: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  admin: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  system: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
  marketing: { bg: 'var(--accent-bg)', text: 'var(--accent-text)' },
};

const TemplateManager = () => {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editChannels, setEditChannels] = useState({});
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewChannel, setPreviewChannel] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedCats, setExpandedCats] = useState({});

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notification-templates');
      setTemplates(res.data);
      const cats = {};
      res.data.forEach(t => { cats[t.category] = true; });
      setExpandedCats(cats);
    } catch {
      addToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = (t) => {
    setSelected(t);
    setEditName(t.name || '');
    setEditIsActive(t.isActive !== false);
    setEditChannels(JSON.parse(JSON.stringify(t.channels || {})));
    setPreviewChannel(null);
  };

  const handleChannelChange = (channel, field, value) => {
    setEditChannels(prev => ({
      ...prev,
      [channel]: { ...(prev[channel] || {}), [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/admin/notification-templates/${selected.key}`, {
        name: editName,
        channels: editChannels,
        isActive: editIsActive,
      });
      addToast('Template saved', 'success');
      fetchTemplates();
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const categorized = {};
  templates.forEach(t => {
    const cat = t.category || 'uncategorized';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(t);
  });

  const filteredCats = filterCategory
    ? { [filterCategory]: categorized[filterCategory] || [] }
    : categorized;

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Notification Templates</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Edit multi-channel notification templates. Each template supports email, in-app, SMS, and push channels.</p>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-dark text-sm" aria-label="Filter by category">
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 border lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto" style={{ borderColor: 'var(--border-base)' }}>
          {Object.entries(filteredCats).map(([cat, items]) => (
            <div key={cat}>
              <button onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                className="w-full flex items-center justify-between p-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {cat} ({items.length})
                {expandedCats[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedCats[cat] && items.map(t => (
                <button key={t.key} onClick={() => selectTemplate(t)}
                  className={`w-full text-left p-3 rounded-xl text-sm transition-all mt-1 ${selected?.key === t.key ? 'ring-1' : ''}`}
                  style={selected?.key === t.key ? { background: 'var(--accent-bg)', color: 'var(--accent-text)' } : { color: 'var(--text-secondary)' }}
                  aria-label={`Select template ${t.key}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate text-xs">{t.name || t.key}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.key}</p>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{editName || selected.key}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.key}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-medium" style={CATEGORY_COLORS[selected.category] || { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' }}>
                    {selected.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input-dark text-sm w-full" aria-label="Template name" />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer mt-5" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} className="rounded" />
                    Active
                  </label>
                </div>
              </div>

              {selected.variables?.length > 0 && (
                <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
                  <h5 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Available Variables</h5>
                  <div className="flex flex-wrap gap-2">
                    {selected.variables.map((v, i) => (
                      <div key={i} className="px-3 py-2 rounded-xl border text-xs" style={{ borderColor: 'var(--border-base)' }}>
                        <code className="font-bold" style={{ color: 'var(--accent-text)' }}>{`{{${v.name}}}`}</code>
                        {v.description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.description}</p>}
                        {v.example && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>e.g. {v.example}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {CHANNEL_CONFIG.map(ch => (
                <div key={ch.key} className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ch.label} Channel</h5>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={editChannels[ch.key]?.isActive !== false} onChange={e => handleChannelChange(ch.key, 'isActive', e.target.checked)} className="rounded" />
                        Active
                      </label>
                      <button onClick={() => setPreviewChannel(previewChannel === ch.key ? null : ch.key)} className="px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>
                        {previewChannel === ch.key ? <EyeOff size={12} /> : <Eye size={12} />} Preview
                      </button>
                    </div>
                  </div>
                  {ch.fields.map(field => (
                    <div key={field} className="mb-3">
                      <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{field}</label>
                      {field === 'body' || field === 'message' ? (
                        <textarea value={editChannels[ch.key]?.[field] || ''} onChange={e => handleChannelChange(ch.key, field, e.target.value)}
                          className="input-dark text-sm w-full font-mono" rows={4} aria-label={`${ch.label} ${field}`} />
                      ) : (
                        <input type="text" value={editChannels[ch.key]?.[field] || ''} onChange={e => handleChannelChange(ch.key, field, e.target.value)}
                          className="input-dark text-sm w-full" aria-label={`${ch.label} ${field}`} />
                      )}
                    </div>
                  ))}
                  {previewChannel === ch.key && (
                    <div className="p-3 rounded-xl border mt-2" style={{ borderColor: 'var(--border-base)', background: 'var(--bg-primary)' }}>
                      <p className="text-[10px] font-medium mb-1 uppercase" style={{ color: 'var(--text-muted)' }}>Preview ({ch.label})</p>
                      {editChannels[ch.key]?.subject && <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Subject: {editChannels[ch.key].subject}</p>}
                      {editChannels[ch.key]?.title && <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Title: {editChannels[ch.key].title}</p>}
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{editChannels[ch.key]?.body || editChannels[ch.key]?.message || '(empty)'}</div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 text-sm" aria-label="Save template">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Template'}
              </button>
            </>
          ) : (
            <div className="glass rounded-2xl p-12 border text-center" style={{ borderColor: 'var(--border-base)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a template to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
