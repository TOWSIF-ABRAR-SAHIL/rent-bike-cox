import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { FileText, Save, Eye } from 'lucide-react';

const TemplateManager = () => {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notification-templates');
      setTemplates(res.data);
    } catch {
      addToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = (t) => {
    setSelected(t);
    setEditBody(t.body);
    setEditSubject(t.subject || '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/admin/notification-templates/${selected.key}`, { body: editBody, subject: editSubject, isActive: selected.isActive });
      addToast('Template saved', 'success');
      fetchTemplates();
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <FileText size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Notification Templates</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Edit email and notification templates. Use {'{{variable}}'} for dynamic content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Template List */}
        <div className="glass rounded-2xl p-4 border lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto" style={{ borderColor: 'var(--border-base)' }}>
          {templates.map(t => (
            <button key={t.key} onClick={() => selectTemplate(t)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all ${selected?.key === t.key ? 'ring-1' : ''}`}
              style={selected?.key === t.key ? { background: 'var(--accent-bg)', color: 'var(--accent-text)' } : { color: 'var(--text-secondary)' }}
              aria-label={`Select template ${t.key}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{t.key}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.subject || 'No subject'}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="glass rounded-2xl p-6 border lg:col-span-2 space-y-4" style={{ borderColor: 'var(--border-base)' }}>
          {selected ? (
            <>
              <div>
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selected.key}</h4>
                {selected.variables?.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Variables: {selected.variables.map(v => <code key={v} className="px-1.5 py-0.5 rounded bg-gray-800 text-amber-400 text-xs mx-0.5">{'{{' + v + '}}'}</code>)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Subject</label>
                <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="input-dark text-sm w-full" aria-label="Template subject" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Body (HTML)</label>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="input-dark text-sm w-full font-mono" rows={12} aria-label="Template body" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm" aria-label="Save template">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setPreview(preview ? null : editBody)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Preview template">
                  <Eye size={14} /> Preview
                </button>
              </div>
              {preview && (
                <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-base)', background: 'var(--bg-primary)' }}>
                  <p className="text-xs font-medium mb-2 uppercase" style={{ color: 'var(--text-muted)' }}>Preview</p>
                  <div dangerouslySetInnerHTML={{ __html: editBody }} />
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>Select a template to edit</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
