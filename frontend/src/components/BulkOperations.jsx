import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const BulkOperations = ({ selectedBikes, onClearSelection, onComplete }) => {
  const [zones, setZones] = useState([]);
  const [action, setAction] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [statusValue, setStatusValue] = useState('active');
  const [zoneValue, setZoneValue] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('service');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data } = await axios.get(`${API}/zones/active`);
        setZones(data);
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      }
    };
    fetchZones();
  }, []);

  const handleExecute = async () => {
    if (!action) return;
    setLoading(true);
    setMessage(null);

    try {
      let result;
      switch (action) {
        case 'status':
          result = await axios.post(`${API}/bulk/status`, {
            bikeIds: selectedBikes,
            availability: statusValue === 'active',
            isUnderMaintenance: statusValue === 'maintenance',
          });
          break;
        case 'zone':
          result = await axios.post(`${API}/bulk/zone`, {
            bikeIds: selectedBikes,
            zoneId: zoneValue || null,
          });
          break;
        case 'maintenance':
          result = await axios.post(`${API}/bulk/maintenance`, {
            bikeIds: selectedBikes,
            type: maintenanceType,
            title: maintenanceTitle,
            nextServiceDue: maintenanceDate,
          });
          break;
        case 'export': {
          result = await axios.post(`${API}/bulk/export-selected`, {
            bikeIds: selectedBikes,
          }, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([result.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `fleet-selected-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          break;
        }
        case 'delete':
          result = await axios.post(`${API}/bulk/delete`, {
            bikeIds: selectedBikes,
          });
          break;
        default:
          return;
      }

      if (action !== 'export') {
        setMessage({ type: 'success', text: result.data.message });
      }
      onComplete();
      setTimeout(() => { setMessage(null); setShowConfirm(false); setAction(''); }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  if (selectedBikes.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{selectedBikes.length} selected</span>
          <button onClick={onClearSelection} className="p-1 rounded-md transition-all" style={{ color: 'var(--accent-text)' }} title="Clear selection">
            <X size={14} />
          </button>
        </div>
        <div className="w-px h-5" style={{ background: 'var(--accent-border)' }} />
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setShowConfirm(false); setMessage(null); }}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Choose action...</option>
          <option value="status">Update Status</option>
          <option value="zone">Assign Zone</option>
          <option value="maintenance">Schedule Maintenance</option>
          <option value="export">Export Selected</option>
          <option value="delete">Deactivate</option>
        </select>
        {action && (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
          >
            Execute
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: message.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
        }}>
          {message.text}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Confirm Action</h3>
              <button onClick={() => setShowConfirm(false)} className="p-1 rounded-md" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              This will apply to <strong>{selectedBikes.length}</strong> vehicle(s).
            </p>

            {action === 'status' && (
              <div className="mb-4">
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Set status to</label>
                <select
                  value={statusValue}
                  onChange={e => setStatusValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                >
                  <option value="active">Active</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
            )}

            {action === 'zone' && (
              <div className="mb-4">
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Assign to zone</label>
                <select
                  value={zoneValue}
                  onChange={e => setZoneValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                >
                  <option value="">No Zone</option>
                  {zones.map(z => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
            )}

            {action === 'maintenance' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
                  <select
                    value={maintenanceType}
                    onChange={e => setMaintenanceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  >
                    <option value="service">Service</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Title</label>
                  <input
                    type="text"
                    value={maintenanceTitle}
                    onChange={e => setMaintenanceTitle(e.target.value)}
                    placeholder="e.g., Oil change, Tire rotation"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Next service due</label>
                  <input
                    type="date"
                    value={maintenanceDate}
                    onChange={e => setMaintenanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {action === 'delete' && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
                Vehicles with active bookings cannot be deactivated. This will set availability to false.
              </div>
            )}

            {action === 'export' && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>A CSV file with {selectedBikes.length} vehicle(s) will be downloaded.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={loading || (action === 'maintenance' && (!maintenanceTitle || !maintenanceDate))}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkOperations;
