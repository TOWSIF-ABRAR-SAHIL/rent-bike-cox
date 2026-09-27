"use client";
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import api, { type ApiError } from '../../api/axios';
import type { ContentItem } from '@/types';
import type { ChangeEvent, FormEvent } from 'react';
import { useToast } from '../useToast';
import { FileText, Save, RotateCcw, Download, Upload, ChevronDown, ChevronRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

const PAGES = [
  { value: '', label: 'All Content' },
  { value: 'home', label: 'Home Page' },
  { value: 'nav', label: 'Navigation' },
  { value: 'footer', label: 'Footer' },
  { value: 'login', label: 'Login' },
  { value: 'signup', label: 'Signup' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'policies', label: 'Policies' },
  { value: 'faq', label: 'FAQ' },
  { value: 'contact', label: 'Contact' },
  { value: 'notFound', label: '404 Page' },
  { value: 'global', label: 'Global' },
];

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  string: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  richText: { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  markdown: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  url: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  image: { bg: 'var(--accent-bg)', text: 'var(--accent-text)' },
  number: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
  json: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

const ContentEditor = () => {
  const { addToast } = useToast();
  const [content, setContent] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<Record<string, ContentItem>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedPage, setSelectedPage] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState('');
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedPage ? `/content/page/${selectedPage}` : '/admin/content';
      const res = await api.get(url);
      if (selectedPage) {
        const grouped = res.data as Record<string, ContentItem[]>;
        const map: Record<string, string> = {};
        const metaMap: Record<string, ContentItem> = {};
        Object.entries(grouped).forEach(([, items]) => {
          items.forEach((item: ContentItem) => {
            map[item.key] = item.value;
            metaMap[item.key] = item;
          });
        });
        setContent(map);
        setMeta(metaMap);
        setExpanded(Object.keys(grouped).reduce((a, s) => ({ ...a, [s]: true }), {}));
      } else {
        const map: Record<string, string> = {};
        const metaMap: Record<string, ContentItem> = {};
        (res.data as ContentItem[]).forEach((item: ContentItem) => {
          map[item.key] = item.value;
          metaMap[item.key] = item;
        });
        setContent(map);
        setMeta(metaMap);
        const sections: Record<string, boolean> = {};
        (res.data as ContentItem[]).forEach((item: ContentItem) => {
          if (item.section) sections[item.section] = true;
        });
        setExpanded(Object.keys(sections).reduce((a, s) => ({ ...a, [s]: true }), {}));
      }
    } catch {
      addToast('Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPage, addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchContent(); }, [fetchContent]);

  const grouped: Record<string, ContentItem[]> = {};
  Object.values(meta).forEach((item: ContentItem) => {
    const sec = item.section || 'Uncategorized';
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(item);
  });

  const handleSave = async (key: string): Promise<void> => {
    setSaving(key);
    try {
      await api.put(`/admin/content/${key}`, { value: content[key] || '' });
      addToast(`Saved`, 'success');
      setDirtyKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkSave = async () => {
    setBulkSaving(true);
    try {
      const updates = Object.keys(meta)
        .filter(key => dirtyKeys.has(key))
        .map(key => ({ key, value: content[key] || '' }));
      if (updates.length === 0) { addToast('No changes to save', 'info'); setBulkSaving(false); return; }
      await api.post('/admin/content/bulk-update', { updates });
      addToast(`${updates.length} items saved`, 'success');
      setDirtyKeys(new Set());
    } catch {
      addToast('Bulk save failed', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleReset = async (key: string): Promise<void> => {
    if (!window.confirm(`Reset "${key}" to default?`)) return;
    try {
      await api.post(`/admin/content/${key}/reset`);
      addToast('Reset to default', 'success');
      fetchContent();
    } catch {
      addToast('Reset failed', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.post('/admin/content/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-content-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Content exported', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) { addToast('Paste JSON data first', 'error'); return; }
    try {
      const data = JSON.parse(importData);
      await api.post('/admin/content/import', { data });
      addToast('Content imported!', 'success');
      setImportData('');
      setImporting(false);
      fetchContent();
    } catch (err) {
      const data = (err as ApiError).response?.data as { message?: string } | undefined;
      addToast(data?.message || 'Invalid JSON', 'error');
    }
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>): void => setImportData(typeof ev.target?.result === 'string' ? ev.target.result : '');
    reader.readAsText(file);
  };

  const markDirty = (key: string, value: string): void => {
    setContent(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => new Set(prev).add(key));
  };

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileText size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Site Content Editor</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Export content">
              <Download size={12} /> Export
            </button>
            <button onClick={() => setImporting(!importing)} className="px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Import content">
              <Upload size={12} /> Import
            </button>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Edit text content across your site. Changes highlight until saved.</p>
      </div>

      {importing && (
        <div className="glass rounded-2xl p-6 border space-y-3" style={{ borderColor: 'var(--border-base)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Import Content</h4>
          <textarea value={importData} onChange={e => setImportData(e.target.value)} className="input-dark text-sm w-full font-mono" rows={6} placeholder='Paste JSON or upload file...' aria-label="Import data" />
          <div className="flex gap-2">
            <label className="px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>
              Choose File <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
            <button onClick={handleImport} className="btn-primary text-sm flex-1">Import</button>
            <button onClick={() => { setImporting(false); setImportData(''); }} className="px-4 py-2 rounded-xl text-xs border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        <select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} className="input-dark text-sm" aria-label="Filter by page">
          {PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {dirtyKeys.size > 0 && (
          <button onClick={handleBulkSave} disabled={bulkSaving} className="btn-primary text-sm flex items-center gap-1" aria-label="Save all changes">
            <Save size={14} /> {bulkSaving ? 'Saving...' : `Save ${dirtyKeys.size} Change${dirtyKeys.size > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {Object.entries(grouped).length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No content found for this page.</p>
      ) : (
        Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-base)' }}>
            <button onClick={() => setExpanded(prev => ({ ...prev, [section]: !prev[section] }))}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              aria-label={`Toggle ${section} section`}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{section.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({items.length})</span></span>
              {expanded[section] ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {expanded[section] && (
              <div className="p-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
                {items.map(item => {
                  const label = item.label || (item.key.split('.').pop() ?? item.key).replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
                  const typeStyle = TYPE_BADGES[item.type ?? ''] || TYPE_BADGES.string;
                  const isDirty = dirtyKeys.has(item.key);
                  return (
                    <div key={item.key} className={`space-y-1 p-3 rounded-xl transition-colors ${isDirty ? 'ring-1 ring-amber-500/30' : ''}`} style={isDirty ? { background: 'var(--warning-bg)' } : {}}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={typeStyle as CSSProperties}>{item.type}</span>
                        {item.validation?.required && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>required</span>}
                        {isDirty && <span className="text-[10px] font-medium" style={{ color: 'var(--warning-text)' }}>unsaved</span>}
                      </div>
                      <code className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>{item.key}</code>
                      {item.placeholder && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Placeholder: {item.placeholder}</p>}
                      <div className="flex gap-2">
                        {item.type === 'richText' || item.type === 'markdown' ? (
                          <>
                            <textarea value={content[item.key] || ''} onChange={e => markDirty(item.key, e.target.value)}
                              className="input-dark flex-1 text-sm font-mono" rows={3} aria-label={`Content value for ${item.key}`} />
                            <div className="flex flex-col gap-1">
                              <button onClick={() => setPreviews(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Toggle preview">
                                {previews[item.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </>
                        ) : (
                          <input type={item.type === 'url' ? 'url' : 'text'} value={content[item.key] || ''} onChange={e => markDirty(item.key, e.target.value)}
                            className="input-dark flex-1 text-sm" placeholder={item.placeholder || item.key} aria-label={`Content value for ${item.key}`} />
                        )}
                        <button onClick={() => handleSave(item.key)} disabled={saving === item.key}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', opacity: saving === item.key ? 0.5 : 1 }} aria-label={`Save ${item.key}`}>
                          {saving === item.key ? '...' : <Save size={14} />}
                        </button>
                        <button onClick={() => handleReset(item.key)} className="px-3 py-2 rounded-lg text-xs font-medium border transition-all" style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }} aria-label={`Reset ${item.key}`}>
                          <RotateCcw size={14} />
                        </button>
                      </div>
                      {previews[item.key] && (
                        <div className="p-3 rounded-xl border mt-1" style={{ borderColor: 'var(--border-base)', background: 'var(--bg-primary)' }}>
                          <p className="text-[10px] font-medium mb-1 uppercase" style={{ color: 'var(--text-muted)' }}>Preview</p>
                          <div className="text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content[item.key] || '') }} />
                        </div>
                      )}
                      {item.validation && (
                        <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {item.validation.minLength && <span>Min: {item.validation.minLength}</span>}
                          {item.validation.maxLength && <span>Max: {item.validation.maxLength}</span>}
                          {item.validation.regex && <span className="flex items-center gap-1"><AlertCircle size={10} /> Pattern match</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ContentEditor;
