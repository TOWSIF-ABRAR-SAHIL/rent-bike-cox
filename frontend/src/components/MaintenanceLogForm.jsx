import { useState } from 'react';
import api from '../api/axios';
import { useToast } from './useToast';
import { Wrench, Loader2 } from 'lucide-react';

const MAINTENANCE_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_replacement', label: 'Tire Replacement' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'battery', label: 'Battery' },
  { value: 'other', label: 'Other' },
];

const MaintenanceLogForm = ({ bikeId, onCreated }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'service',
    title: '',
    description: '',
    cost: '',
    mileage: '',
    nextServiceDue: '',
    nextServiceMileage: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        bikeId,
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        cost: form.cost ? Number(form.cost) : 0,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        nextServiceDue: form.nextServiceDue || undefined,
        nextServiceMileage: form.nextServiceMileage ? Number(form.nextServiceMileage) : undefined,
        notes: form.notes || undefined,
      };

      await api.post('/maintenance', payload);
      addToast('Maintenance log created!', 'success');
      setForm({ type: 'service', title: '', description: '', cost: '', mileage: '', nextServiceDue: '', nextServiceMileage: '', notes: '' });
      if (onCreated) onCreated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create maintenance log', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 border space-y-4" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Wrench size={18} style={{ color: 'var(--accent-text)' }} />
        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Add Maintenance Log</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Type</label>
          <select value={form.type} onChange={e => handleChange('type', e.target.value)} className="input-dark text-sm w-full">
            {MAINTENANCE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Title *</label>
          <input type="text" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Oil change, Brake pad replacement" className="input-dark text-sm w-full" required />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cost (TK)</label>
          <input type="number" min="0" value={form.cost} onChange={e => handleChange('cost', e.target.value)} placeholder="0" className="input-dark text-sm w-full" />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Current Mileage (km)</label>
          <input type="number" min="0" value={form.mileage} onChange={e => handleChange('mileage', e.target.value)} placeholder="e.g. 5000" className="input-dark text-sm w-full" />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Next Service Due</label>
          <input type="date" value={form.nextServiceDue} onChange={e => handleChange('nextServiceDue', e.target.value)} className="input-dark text-sm w-full" />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Next Service at Mileage</label>
          <input type="number" min="0" value={form.nextServiceMileage} onChange={e => handleChange('nextServiceMileage', e.target.value)} placeholder="e.g. 10000" className="input-dark text-sm w-full" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Details about the maintenance work..." className="input-dark text-sm w-full min-h-[60px] resize-none" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Notes</label>
          <input type="text" value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional notes" className="input-dark text-sm w-full" />
        </div>
      </div>

      <button type="submit" disabled={loading || !form.title} className="btn-primary flex items-center justify-center disabled:opacity-50">
        {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><Wrench size={16} className="mr-2" /> Log Maintenance</>}
      </button>
    </form>
  );
};

export default MaintenanceLogForm;
