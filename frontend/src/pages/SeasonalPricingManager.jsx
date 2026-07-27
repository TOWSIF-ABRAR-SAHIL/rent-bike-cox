import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Calendar, Plus, Trash2, Edit3, Check, X, RefreshCw } from 'lucide-react';

const TYPES = [
  { value: 'peak', label: 'Peak Season', color: 'text-orange-400' },
  { value: 'offpeak', label: 'Off-Peak', color: 'text-emerald-400' },
  { value: 'holiday', label: 'Holiday', color: 'text-red-400' },
  { value: 'weekend', label: 'Weekend', color: 'text-blue-400' },
  { value: 'custom', label: 'Custom', color: 'text-purple-400' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyForm = {
  name: '', type: 'peak', multiplier: 1.0, startDate: '', endDate: '',
  recurringYearly: false, month: '', dayOfMonth: '', daysOfWeek: [],
  isActive: true, priority: 0, description: '',
};

export default function SeasonalPricingManager() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRates = async () => {
    try {
      const { data } = await api.get('/admin/seasonal-rates');
      setRates(data);
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRates();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/seasonal-rates/${editing._id}`, form);
      } else {
        await api.post('/admin/seasonal-rates', form);
      }
      setForm(emptyForm);
      setEditing(null);
      fetchRates();
    } catch { /* */ } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rate?')) return;
    await api.delete(`/admin/seasonal-rates/${id}`);
    fetchRates();
  };

  const handleEdit = (rate) => {
    setEditing(rate);
    setForm({
      name: rate.name,
      type: rate.type,
      multiplier: rate.multiplier,
      startDate: rate.startDate ? new Date(rate.startDate).toISOString().split('T')[0] : '',
      endDate: rate.endDate ? new Date(rate.endDate).toISOString().split('T')[0] : '',
      recurringYearly: rate.recurringYearly || false,
      month: rate.month || '',
      dayOfMonth: rate.dayOfMonth || '',
      daysOfWeek: rate.daysOfWeek || [],
      isActive: rate.isActive !== false,
      priority: rate.priority || 0,
      description: rate.description || '',
    });
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day],
    }));
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Calendar size={28} className="text-amber-400" />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Seasonal Pricing</h1>
      </div>

      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {editing ? 'Edit Rate' : 'Add New Rate'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name (e.g., Eid Holiday)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
           aria-label="Name (e.g., Eid Holiday)"/>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
            aria-label="Rate type"
          >
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Multiplier</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              value={form.multiplier}
              onChange={e => setForm(f => ({ ...f, multiplier: parseFloat(e.target.value) || 1 }))}
              className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none w-full"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
             aria-label="Multiplier"/>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Priority (higher wins)</label>
            <input
              type="number"
              min="0"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
              className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none w-full"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
             aria-label="(higher wins)"/>
          </div>
          {form.type !== 'weekend' && !form.recurringYearly && (
            <>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
               aria-label="Select date"/>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
               aria-label="Select date"/>
            </>
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={form.recurringYearly}
                onChange={e => setForm(f => ({ ...f, recurringYearly: e.target.checked }))}
                className="rounded accent-amber-500"
              />
              Recurring yearly
            </label>
          </div>
          {form.recurringYearly && (
            <>
              <select
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) || '' }))}
                className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
               aria-label="Select month">
                <option value="">Month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) =>
                  <option key={i+1} value={i+1}>{m}</option>
                )}
              </select>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Day"
                value={form.dayOfMonth}
                onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value) || '' }))}
                className="rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
               aria-label="Day"/>
            </>
          )}
          {form.type === 'weekend' && (
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Days of week</label>
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className="px-3 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      background: form.daysOfWeek.includes(i) ? 'var(--accent-bg)' : 'var(--hover-bg)',
                      color: form.daysOfWeek.includes(i) ? 'var(--accent-text)' : 'var(--text-secondary)',
                      border: `1px solid ${form.daysOfWeek.includes(i) ? 'var(--accent-border)' : 'var(--border-base)'}`,
                    }}
                   aria-label="Toggle day">
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="sm:col-span-2 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
           aria-label="Description (optional)"/>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent-bg-solid, #f59e0b)' }}
           aria-label="Save changes">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : editing ? <Check size={14} /> : <Plus size={14} />}
            {editing ? 'Update' : 'Create'}
          </button>
          {editing && (
              <button
              onClick={() => { setEditing(null); setForm(emptyForm); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
              style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)', border: '1px solid var(--border-base)' }}
              aria-label="Cancel editing"
            >
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rates.length === 0 && (
          <div className="text-center py-8 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
            No seasonal rates configured yet.
          </div>
        )}
        {rates.map(rate => {
          const typeInfo = TYPES.find(t => t.value === rate.type);
          return (
            <div
              key={rate._id}
              className="flex items-center justify-between rounded-xl p-4 transition-all hover:opacity-90"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${typeInfo?.color || 'text-gray-400'}`}>
                    {typeInfo?.label || rate.type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {rate.multiplier}x
                  </span>
                  {!rate.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Inactive</span>}
                  {rate.recurringYearly && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Yearly</span>}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rate.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {rate.startDate && rate.endDate && !rate.recurringYearly &&
                    `${new Date(rate.startDate).toLocaleDateString()} - ${new Date(rate.endDate).toLocaleDateString()}`
                  }
                  {rate.recurringYearly && rate.month && rate.dayOfMonth &&
                    `Every ${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][rate.month]} ${rate.dayOfMonth}`
                  }
                  {rate.type === 'weekend' && rate.daysOfWeek?.length > 0 &&
                    `Every ${rate.daysOfWeek.map(d => DAYS[d]).join(', ')}`
                  }
                  {rate.description && ` — ${rate.description}`}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button onClick={() => handleEdit(rate)} className="p-2 rounded-lg transition-colors hover:bg-amber-500/10" style={{ color: 'var(--text-muted)' }} aria-label="Edit rate">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(rate._id)} className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-400" aria-label="Delete rate">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
