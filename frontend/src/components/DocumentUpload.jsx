import { useState, useRef } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';

const TYPES = [
  { value: 'registration', label: 'Registration Certificate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'pollution', label: 'Pollution Certificate' },
  { value: 'other', label: 'Other' },
];

export default function DocumentUpload({ bikeId, onUploaded }) {
  const [form, setForm] = useState({
    type: 'registration', name: '', documentNumber: '',
    issueDate: '', expiryDate: '', issuingAuthority: '', notes: '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !form.name) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('file', file);
      const { default: api } = await import('../api/axios');
      await api.post(`/vehicle-docs/bike/${bikeId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ type: 'registration', name: '', documentNumber: '', issueDate: '', expiryDate: '', issuingAuthority: '', notes: '' });
      setFile(null);
      onUploaded?.();
    } catch { /* */ } finally { setSaving(false); }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-5 space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Upload size={16} className="text-amber-400" /> Upload Document
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
        >
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Document name *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
        />
        <input
          type="text"
          placeholder="Document number"
          value={form.documentNumber}
          onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
        />
        <input
          type="text"
          placeholder="Issuing authority"
          value={form.issuingAuthority}
          onChange={e => setForm(f => ({ ...f, issuingAuthority: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
        />
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Issue date</label>
          <input
            type="date"
            value={form.issueDate}
            onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm outline-none w-full"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expiry date</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm outline-none w-full"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
          />
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? 'var(--accent-border)' : file ? '#10b981' : 'var(--border-base)',
          background: dragOver ? 'var(--accent-bg)' : file ? 'rgba(16,185,129,0.05)' : 'var(--hover-bg)',
        }}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-red-400 hover:text-red-300">
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Drop file or click to select</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !file || !form.name}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        style={{ background: 'var(--accent-bg-solid, #f59e0b)' }}
      >
        {saving ? 'Uploading...' : <><Check size={14} /> Upload</>}
      </button>
    </form>
  );
}
