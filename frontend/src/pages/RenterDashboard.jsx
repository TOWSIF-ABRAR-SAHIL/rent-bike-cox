import { useState, useEffect, useCallback, memo } from 'react';
import api from '../api/axios';
import {
  PlusCircle, Bike as BikeIcon, ToggleLeft, ToggleRight, Loader2, X, Timer, Wrench, DollarSign,
  BarChart3, CalendarCheck, MapPin, CheckCircle2, Clock4, Images,} from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import VehicleHealthCard from '../components/VehicleHealthCard';
import MaintenanceLogForm from '../components/MaintenanceLogForm';
import MaintenanceHistory from '../components/MaintenanceHistory';
import RenterEarnings from '../components/RenterEarnings';
import LiveFleetMap from '../components/LiveFleetMap';

function generateDefaultTiers(pricePerHour) {
  if (!pricePerHour || pricePerHour <= 0) return [];
  return [
    { label: '1-2 Hours', minHours: 1, maxHours: 2, hourlyRate: pricePerHour },
    { label: '3-4 Hours', minHours: 3, maxHours: 4, hourlyRate: Math.round(pricePerHour * 0.9) },
    { label: '5+ Hours', minHours: 5, maxHours: null, hourlyRate: Math.max(150, Math.round(pricePerHour * 0.75)) },
  ];
}

const TierBuilder = ({ packages, onChange, basePrice }) => {
  const addTier = () => {
    onChange([...packages, { label: '', minHours: 1, maxHours: null, hourlyRate: 0 }]);
  };

  const updateTier = (index, field, value) => {
    const updated = packages.map((tier, i) => i === index ? { ...tier, [field]: value } : tier);
    onChange(updated);
  };

  const removeTier = (index) => {
    onChange(packages.filter((_, i) => i !== index));
  };

  const autoGenerate = (base) => {
    onChange(generateDefaultTiers(base));
  };

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium uppercase tracking-wide flex items-center" style={{ color: 'var(--text-secondary)' }}>
          <Timer size={14} className="mr-1.5" /> Pricing Tiers
        </label>
        <button type="button" onClick={() => autoGenerate(basePrice || 200)}
          className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:opacity-80"
          style={{ color: 'var(--accent-text)', borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}
          aria-label="Auto-generate pricing tiers">
          Auto-Generate
        </button>
      </div>
      <p className="text-xs mb-3 font-regular" style={{ color: 'var(--text-muted)' }}>
        Define pricing tiers per hour range. Customers pick any duration — best tier auto-applies. Min floor: 150 TK/hr.
      </p>

      {packages.length > 0 && (
        <div className="space-y-2 mb-3">
          {packages.map((tier, i) => (
            <div key={i} className="flex gap-2 items-start p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)' }}>
              <input type="text" placeholder="Label (e.g. 1-2 Hours)" value={tier.label}
                onChange={e => updateTier(i, 'label', e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-28" aria-label="Label (e.g. 1-2 Hours)" />
              <input type="number" placeholder="Min H" min="1" value={tier.minHours}
                onChange={e => updateTier(i, 'minHours', Number(e.target.value) || 1)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-16" aria-label="Min H" />
              <input type="number" placeholder="Max H" min="0" value={tier.maxHours ?? ''}
                onChange={e => updateTier(i, 'maxHours', e.target.value === '' ? null : Number(e.target.value))}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-16"
                title="Leave empty for unlimited" aria-label="Max H" />
              <div className="flex items-center flex-shrink-0">
                <input type="number" placeholder="Rate" min="0" value={tier.hourlyRate}
                  onChange={e => updateTier(i, 'hourlyRate', Number(e.target.value) || 0)}
                  className="input-dark !py-1.5 !px-2.5 text-xs w-20" aria-label="Rate" />
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>TK</span>
              </div>
              <button type="button" onClick={() => removeTier(i)}
                className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                style={{ color: 'var(--danger-text)' }} aria-label="Remove pricing tier">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addTier}
        className="w-full py-2 rounded-xl border-2 border-dashed text-xs font-medium transition-all hover:opacity-80"
        style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }} aria-label="Add pricing tier">
        + Add Tier
      </button>
    </div>
  );
};

const AddBikeModal = ({ open, onClose, categories, initialCategory, onSubmit, submitting }) => {
  const [newBike, setNewBike] = useState({
    model: '', brand: '', category: initialCategory || '', description: '', pricePerHour: 200, videoUrl: '',
  });
  const [bikePackages, setBikePackages] = useState([]);
  const [bikeFiles, setBikeFiles] = useState([]);

  if (!open) return null;

  const fieldStyle = {
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    color: '#111827',
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const focusStyle = {
    borderColor: '#F97316',
    boxShadow: '0 0 0 3px rgba(249,115,22,0.15)',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ newBike, bikePackages, bikeFiles });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add new vehicle">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl animate-slide-up" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-base)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add New Vehicle</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-all hover:opacity-80" style={{ color: 'var(--text-muted)' }} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Brand</label>
            <input type="text" placeholder="e.g. Yamaha" required
              value={newBike.brand} onChange={e => setNewBike({ ...newBike, brand: e.target.value })}
              style={fieldStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Brand" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Model</label>
            <input type="text" placeholder="e.g. FZ-S V3" required
              value={newBike.model} onChange={e => setNewBike({ ...newBike, model: e.target.value })}
              style={fieldStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Model" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select value={newBike.category} onChange={e => setNewBike({ ...newBike, category: e.target.value })} required
              style={fieldStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Select category">
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Price Per Hour (TK)</label>
            <input type="number" min="0" required
              value={newBike.pricePerHour} onChange={e => setNewBike({ ...newBike, pricePerHour: Number(e.target.value) || 0 })}
              style={fieldStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Price Per Hour" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea rows={3} placeholder="Describe the vehicle..." required
              value={newBike.description} onChange={e => setNewBike({ ...newBike, description: e.target.value })}
              style={{ ...fieldStyle, resize: 'none' }} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Description" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Video URL (optional, YouTube/Vimeo)</label>
            <input type="text" placeholder="https://..." value={newBike.videoUrl} onChange={e => setNewBike({ ...newBike, videoUrl: e.target.value })}
              style={fieldStyle} onFocus={e => Object.assign(e.target.style, focusStyle)} onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              aria-label="Video URL (optional, YouTube/Vimeo)" />
          </div>

          <TierBuilder packages={bikePackages} onChange={setBikePackages} basePrice={newBike.pricePerHour} />

          <div className="md:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <Images size={13} className="inline mr-1" /> Upload Vehicle Photos
            </label>
            <input
              type="file" multiple accept="image/jpeg,image/png"
              style={fieldStyle}
              onChange={e => {
                const files = Array.from(e.target.files || []);
                const oversized = files.find(f => f.size > 5 * 1024 * 1024);
                if (oversized) {
                  alert('File too large: ' + oversized.name + '. Maximum 5MB allowed.');
                  e.target.value = '';
                  return;
                }
                setBikeFiles(e.target.files);
              }}
              aria-label="Upload vehicle photos" />
          </div>

          <div className="md:col-span-2 flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all" style={{ border: '1px solid var(--border-base)', color: 'var(--text-secondary)' }}
              aria-label="Cancel">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white gradient-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Save vehicle">
              {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><PlusCircle size={16} className="mr-2" /> Save Vehicle</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color }} />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
    <p className="text-xl font-bold" style={{ color }}>{value}</p>
  </div>
);

const STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  cancelled: 'Cancelled',
};

const STATUS_STYLES = {
  completed: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  in_progress: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  scheduled: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  cancelled: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

const RenterDashboard = () => {
  const { addToast } = useToast();
  const [bikes, setBikes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [maintOverview, setMaintOverview] = useState(null);

  const fetchDashboard = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setFetchError('');
    Promise.allSettled([
      api.get('/dashboard/my-bikes'),
      api.get('/dashboard/categories'),
    ]).then(([bikesRes, catsRes]) => {
      if (bikesRes.status === 'fulfilled') setBikes(bikesRes.value.data);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data);
      const failedCount = [bikesRes, catsRes].filter(r => r.status === 'rejected').length;
      if (failedCount > 0) addToast(`Failed to load ${failedCount} of 2 data sources`, 'error');
    }).catch(() => { addToast('Failed to fetch data', 'error'); setFetchError('Failed to load dashboard data.'); })
      .finally(() => setLoading(false));
  }, [addToast]);

  const fetchMaintenanceOverview = useCallback(() => {
    api.get('/maintenance/renter/overview').then(res => setMaintOverview(res.data)).catch(() => setMaintOverview(null));
  }, []);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard(true);
    fetchMaintenanceOverview();
  }, [fetchDashboard, fetchMaintenanceOverview]);

  useEffect(() => {
    if (activeTab === 'maintenance') {
      fetchMaintenanceOverview();
      api.get('/dashboard/my-bikes').then(res => setBikes(res.data)).catch(() => {});
    }
  }, [activeTab, fetchMaintenanceOverview]);

  const handleSubmitNew = useCallback(async ({ newBike, bikePackages, bikeFiles }) => {
    setSubmitting(true);
    const formDataToSend = new FormData();
    Object.keys(newBike).forEach(key => { if (newBike[key]) formDataToSend.append(key, newBike[key]); });
    if (bikePackages.length > 0) {
      const cleanPackages = bikePackages.map(({ label, minHours, maxHours, hourlyRate }) => ({ label, minHours, maxHours, hourlyRate }));
      formDataToSend.append('packages', JSON.stringify(cleanPackages));
    }
    Array.from(bikeFiles).forEach(file => formDataToSend.append('bikeImages', file));
    try {
      await api.post('/dashboard/bikes', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      const res = await api.get('/dashboard/my-bikes');
      setBikes(res.data);
      addToast('Bike added successfully!', 'success');
    } catch {
      addToast('Failed to add bike', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [addToast]);

  const toggleAvailability = useCallback(async (bikeId) => {
    try {
      const res = await api.put(`/dashboard/bikes/${bikeId}/availability`);
      setBikes(prev => prev.map(bike => bike._id === bikeId ? { ...bike, availability: res.data.bike.availability } : bike));
      addToast(`Bike is now ${res.data.bike.availability ? 'available' : 'unavailable'}`, 'success');
    } catch {
      addToast('Failed to update availability', 'error');
    }
  }, [addToast]);

  const title = (bike) => {
    const model = bike.model || '';
    const brand = bike.brand || '';
    if (model && brand && model.toLowerCase().startsWith(brand.toLowerCase())) return model;
    return [brand, model].filter(Boolean).join(' ');
  };

  if (loading) return <SkeletonPage />;

  if (fetchError) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center glass rounded-2xl p-8 max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => fetchDashboard()} className="btn-primary" aria-label="Reload page">Try Again</button>
      </div>
    </div>
  );

  const vehiclesKpi = [
    { label: 'Total Vehicles', value: bikes.length, icon: BarChart3, color: 'var(--accent-text)' },
    { label: 'Available', value: bikes.filter(b => b.availability).length, icon: CalendarCheck, color: 'var(--success-text)' },
    { label: 'Under Maintenance', value: bikes.filter(b => b.isUnderMaintenance).length, icon: Wrench, color: 'var(--warning-text)' },
  ];

  const maintStats = maintOverview?.stats || { scheduled: 0, inProgress: 0, completed: 0 };
  const maintenanceKpi = [
    { label: 'Scheduled Maintenance', value: maintStats.scheduled, icon: CalendarCheck, color: 'var(--info-text, #3b82f6)' },
    { label: 'In Progress', value: maintStats.inProgress, icon: Wrench, color: 'var(--warning-text)' },
    { label: 'Completed', value: maintStats.completed, icon: CheckCircle2, color: 'var(--success-text)' },
  ];

  const trackingKpi = [
    { label: 'Total Fleet', value: bikes.length, icon: BarChart3, color: 'var(--accent-text)' },
    { label: 'Active Rides', value: bikes.filter(b => b.availability && !b.isUnderMaintenance).length, icon: MapPin, color: 'var(--success-text)' },
    { label: 'Offline Vehicles', value: bikes.filter(b => !b.availability || b.isUnderMaintenance).length, icon: Clock4, color: 'var(--warning-text)' },
  ];

  const activeKpi = activeTab === 'vehicles' ? vehiclesKpi : activeTab === 'maintenance' ? maintenanceKpi : activeTab === 'tracking' ? trackingKpi : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Renter Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your fleet, maintenance and earnings</p>
        </div>
        {activeTab === 'vehicles' && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center" aria-label="Add new vehicle">
            <PlusCircle className="mr-2" size={20} /> Add New Vehicle
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'vehicles', label: 'Vehicles', icon: BikeIcon },
          { key: 'maintenance', label: 'Maintenance', icon: Wrench },
          { key: 'earnings', label: 'Earnings', icon: DollarSign },
          { key: 'tracking', label: 'Tracking', icon: MapPin },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${active ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`}
              style={active ? { color: 'white' } : { color: 'var(--text-secondary)' }}
              aria-label={`Switch to ${tab.label} tab`} aria-pressed={active}>
              <tab.icon className="mr-2" size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeKpi && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {activeKpi.map(kpi => (
            <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} color={kpi.color} />
          ))}
        </div>
      )}

      {activeTab === 'vehicles' && (
        <>
          {bikes.length === 0 ? (
            <EmptyState
              icon={BikeIcon}
              title="No vehicles yet"
              description="Add your first vehicle to start renting"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bikes.map(bike => {
                const image = bike.images?.[0] || 'https://placehold.co/600x400/1a1a2e/666?text=No+Image';
                return (
                  <div key={bike._id} className="glass rounded-2xl overflow-hidden card-hover">
                    <img src={image} alt={title(bike)} width="400" height="300" loading="lazy"
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a1a2e/666?text=No+Image'; }} />
                    <div className="p-5">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{title(bike)}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.category?.name || 'N/A'}</p>
                        <p className="font-semibold text-sm mt-1" style={{ color: 'var(--accent-text)' }}>{bike.pricePerHour} TK/hr</p>
                        {bike.packages?.length > 0 && (
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{bike.packages.length} pricing tiers</p>
                        )}
                        {bike.zone && (
                          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span>{bike.zone.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{ background: bike.availability ? 'var(--success-bg)' : 'var(--danger-bg)', color: bike.availability ? 'var(--success-text)' : 'var(--danger-text)', borderColor: bike.availability ? 'var(--success-border)' : 'var(--danger-border)' }}>
                          {bike.availability ? 'Available' : 'Booked'}
                        </span>
                        <button onClick={() => toggleAvailability(bike._id)}
                          className="flex items-center px-3 py-2.5 min-h-11 rounded-lg text-xs font-medium transition-all border"
                          style={bike.availability
                            ? { background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }
                            : { color: 'var(--text-muted)', background: 'var(--hover-bg)', borderColor: 'var(--border-base)' }}
                          aria-label="Toggle vehicle availability">
                          {bike.availability ? <ToggleRight size={14} className="mr-1" /> : <ToggleLeft size={14} className="mr-1" />}
                          {bike.availability ? 'Available' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Vehicle Health</h3>
            {bikes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No vehicles to display health status</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bikes.map(bike => <VehicleHealthCard key={bike._id} bike={bike} />)}
              </div>
            )}
          </div>

          {bikes.length > 0 && (
            <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <label className="text-sm font-medium uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Wrench size={15} style={{ color: 'var(--accent-text)' }} /> Select Vehicle for Maintenance Log
                </label>
                <select value={selectedBikeId || ''} onChange={e => {
                  setSelectedBikeId(e.target.value);
                  fetchMaintenanceOverview();
                }} className="input-dark !py-2 !px-3 text-sm flex-1 sm:flex-none sm:w-72" aria-label="Vehicle for Maintenance Log">
                  <option value="">Choose a vehicle...</option>
                  {bikes.map(bike => (
                    <option key={bike._id} value={bike._id}>{title(bike)}</option>
                  ))}
                </select>
              </div>

              {selectedBikeId && (
                <div className="space-y-5">
                  <MaintenanceLogForm bikeId={selectedBikeId} onCreated={() => {
                    api.get('/dashboard/my-bikes').then(res => setBikes(res.data));
                    fetchMaintenanceOverview();
                  }} />
                  <MaintenanceHistory bikeId={selectedBikeId} />
                </div>
              )}
            </div>
          )}

          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <h3 className="font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Clock4 size={16} style={{ color: 'var(--accent-text)' }} /> Maintenance History Log
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>All maintenance records across your fleet</p>
            {(!maintOverview || !maintOverview.logs || maintOverview.logs.length === 0) ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No maintenance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-base)' }}>
                      <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Vehicle Name</th>
                      <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Service Date</th>
                      <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Issue Description</th>
                      <th className="text-right py-3 px-2 font-semibold text-xs uppercase tracking-wide">Cost (TK)</th>
                      <th className="text-left py-3 px-2 font-semibold text-xs uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintOverview.logs.map(log => (
                      <tr key={log._id} style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{log.vehicle}</td>
                        <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{new Date(log.serviceDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{log.issueDescription}</td>
                        <td className="py-3 px-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{(log.cost || 0).toLocaleString()} TK</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium capitalize"
                            style={{ background: (STATUS_STYLES[log.status] || STATUS_STYLES.completed).bg, color: (STATUS_STYLES[log.status] || STATUS_STYLES.completed).text }}>
                            {STATUS_LABELS[log.status] || log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'earnings' && <RenterEarnings />}
      {activeTab === 'tracking' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Live Vehicle Tracking</h2>
          </div>
          <div style={{ height: 'calc(100vh - 250px)' }}>
            <LiveFleetMap fullHeight sidePanel />
          </div>
        </div>
      )}

      <AddBikeModal
        open={showForm}
        onClose={() => setShowForm(false)}
        categories={categories}
        initialCategory={categories[0]?._id || ''}
        onSubmit={handleSubmitNew}
        submitting={submitting}
      />
    </div>
  );
};

export default memo(RenterDashboard);
