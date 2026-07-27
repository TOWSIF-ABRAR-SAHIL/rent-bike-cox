import { useState } from 'react';
import api from '../api/axios';
import { MapPin, Trash2, Edit2 } from 'lucide-react';
import { useToast } from './useToast';

const ZoneCard = ({ zone, onUpdate, onDelete }) => {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone.name);
  const [description, setDescription] = useState(zone.description || '');
  const [color, setColor] = useState(zone.color || '#f59e0b');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/zones/${zone._id}`, { name, description, color });
      addToast('Zone updated', 'success');
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update zone', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
    try {
      await api.delete(`/zones/${zone._id}`);
      addToast('Zone deleted', 'success');
      if (onDelete) onDelete();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete zone', 'error');
    }
  };

  if (editing) {
    return (
      <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-dark text-sm w-full" placeholder="Zone name" />
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-dark text-sm w-full" placeholder="Description (optional)" />
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Color:</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !name} className="flex-1 btn-primary text-xs flex items-center justify-center">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 border card-hover" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color || '#f59e0b' }} />
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{zone.name}</h3>
            {zone.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{zone.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg transition-all hover:bg-amber-500/10" style={{ color: 'var(--text-muted)' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg transition-all hover:bg-red-500/10" style={{ color: 'var(--danger-text)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <MapPin size={12} />
        <span>{zone.isActive ? 'Active' : 'Inactive'}</span>
        {zone.bikeCount > 0 && <span>{zone.bikeCount} bikes</span>}
      </div>
    </div>
  );
};

export default ZoneCard;
