import { useState, useEffect, useCallback, memo } from 'react';
import api from '../api/axios';
import { PlusCircle, Bike as BikeIcon, ToggleLeft, ToggleRight, Loader2, X, Timer, Wrench, DollarSign, BarChart3, CalendarCheck, AlertTriangle, MapPin } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import FleetOverview from '../components/FleetOverview';
import MaintenanceSchedule from '../components/MaintenanceSchedule';
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
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Define pricing tiers per hour range. Customers pick any duration — best tier auto-applies. Min floor: 150 TK/hr.
      </p>

      {packages.length > 0 && (
        <div className="space-y-2 mb-3">
          {packages.map((tier, i) => (
            <div key={i} className="flex gap-2 items-start p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)' }}>
              <input type="text" placeholder="Label (e.g. 1-2 Hours)" value={tier.label}
                onChange={e => updateTier(i, 'label', e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-28"  aria-label="Label (e.g. 1-2 Hours)"/>
              <input type="number" placeholder="Min H" min="1" value={tier.minHours}
                onChange={e => updateTier(i, 'minHours', Number(e.target.value) || 1)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-16"  aria-label="Min H"/>
              <input type="number" placeholder="Max H" min="0" value={tier.maxHours ?? ''}
                onChange={e => updateTier(i, 'maxHours', e.target.value === '' ? null : Number(e.target.value))}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-16"
                title="Leave empty for unlimited"  aria-label="Max H"/>
              <div className="flex items-center flex-shrink-0">
                <input type="number" placeholder="Rate" min="0" value={tier.hourlyRate}
                  onChange={e => updateTier(i, 'hourlyRate', Number(e.target.value) || 0)}
                  className="input-dark !py-1.5 !px-2.5 text-xs w-20"  aria-label="Rate"/>
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

const RenterDashboard = () => {
  const { addToast } = useToast();
  const [bikes, setBikes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [newBike, setNewBike] = useState({
    model: '', brand: '', category: '', description: '', pricePerHour: 200, videoUrl: ''
  });
  const [bikePackages, setBikePackages] = useState([]);
  const [bikeFiles, setBikeFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setFetchError('');
    Promise.allSettled([
      api.get('/dashboard/my-bikes'),
      api.get('/dashboard/categories'),
    ]).then(([bikesRes, catsRes]) => {
      if (bikesRes.status === 'fulfilled') setBikes(bikesRes.value.data);
      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.data);
        if (catsRes.value.data.length > 0) setNewBike(prev => ({ ...prev, category: catsRes.value.data[0]._id }));
      }
      const failedCount = [bikesRes, catsRes].filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        addToast(`Failed to load ${failedCount} of 2 data sources`, 'error');
      }
    }).catch(() => { addToast('Failed to fetch data', 'error'); setFetchError('Failed to load dashboard data.'); })
      .finally(() => setLoading(false));
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
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
      setNewBike({ model: '', brand: '', category: categories[0]?._id || '', description: '', pricePerHour: 200, videoUrl: '' });
      setBikePackages([]);
      setBikeFiles([]);
      const res = await api.get('/dashboard/my-bikes');
      setBikes(res.data);
      addToast('Bike added successfully!', 'success');
    } catch { addToast('Failed to add bike', 'error'); } finally { setSubmitting(false); }
  }, [newBike, bikePackages, bikeFiles, categories, addToast]);

  const toggleAvailability = useCallback(async (bikeId) => {
    try {
      const res = await api.put(`/dashboard/bikes/${bikeId}/availability`);
      setBikes(prev => prev.map(bike => bike._id === bikeId ? { ...bike, availability: res.data.bike.availability } : bike));
      addToast(`Bike is now ${res.data.bike.availability ? 'available' : 'unavailable'}`, 'success');
    } catch { addToast('Failed to update availability', 'error'); }
  }, [addToast]);

  if (loading) return <SkeletonPage />;

  if (fetchError) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center glass rounded-2xl p-8 max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => fetchDashboard()} className="btn-primary" aria-label="Reload page">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Renter Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your vehicles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center" aria-label="Toggle add vehicle form">
          <PlusCircle className="mr-2" size={20} /> Add New Vehicle
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTab('vehicles')} className={`flex items-center px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${activeTab === 'vehicles' ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`} style={activeTab === 'vehicles' ? { color: 'white' } : { color: 'var(--text-secondary)' }} aria-label="Switch to vehicles tab" aria-pressed={activeTab === 'vehicles'}>
          <BikeIcon className="mr-2" size={16} /> Vehicles
        </button>
        <button onClick={() => setActiveTab('maintenance')} className={`flex items-center px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${activeTab === 'maintenance' ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`} style={activeTab === 'maintenance' ? { color: 'white' } : { color: 'var(--text-secondary)' }} aria-label="Switch to maintenance tab" aria-pressed={activeTab === 'maintenance'}>
          <Wrench className="mr-2" size={16} /> Maintenance
        </button>
        <button onClick={() => setActiveTab('earnings')} className={`flex items-center px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${activeTab === 'earnings' ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`} style={activeTab === 'earnings' ? { color: 'white' } : { color: 'var(--text-secondary)' }} aria-label="Switch to earnings tab" aria-pressed={activeTab === 'earnings'}>
          <DollarSign className="mr-2" size={16} /> Earnings
        </button>
        <button onClick={() => setActiveTab('tracking')} className={`flex items-center px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${activeTab === 'tracking' ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'}`} style={activeTab === 'tracking' ? { color: 'white' } : { color: 'var(--text-secondary)' }} aria-label="Switch to tracking tab" aria-pressed={activeTab === 'tracking'}>
          <MapPin className="mr-2" size={16} /> Tracking
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} style={{ color: 'var(--accent-text)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Vehicles</p>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{bikes.length}</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={14} style={{ color: 'var(--success-text)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Available</p>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--success-text)' }}>{bikes.filter(b => b.availability).length}</p>
        </div>
        <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: 'var(--warning-text)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Under Maintenance</p>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--warning-text)' }}>{bikes.filter(b => b.isUnderMaintenance).length}</p>
        </div>
      </div>

      {activeTab === 'vehicles' && (
        <>
          {showForm && (
            <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Model" className="input-dark text-sm" value={newBike.model} onChange={e => setNewBike({...newBike, model: e.target.value})} required aria-label="Model" />
              <input type="text" placeholder="Brand" className="input-dark text-sm" value={newBike.brand} onChange={e => setNewBike({...newBike, brand: e.target.value})} required aria-label="Brand" />
              <select className="input-dark text-sm" value={newBike.category} onChange={e => setNewBike({...newBike, category: e.target.value})} required aria-label="Select category">
                {categories.map(cat => <option key={cat._id} value={cat._id} style={{ background: 'var(--bg-surface)' }}>{cat.name}</option>)}
              </select>
              <input type="number" placeholder="Price Per Hour" className="input-dark text-sm" value={newBike.pricePerHour} onChange={e => setNewBike({...newBike, pricePerHour: Number(e.target.value) || 0})} required aria-label="Price Per Hour" />
              <textarea placeholder="Description" className="input-dark text-sm md:col-span-2 min-h-[80px] resize-none" value={newBike.description} onChange={e => setNewBike({...newBike, description: e.target.value})} required />
              <input type="text" placeholder="Video URL (optional, YouTube/Vimeo)" className="input-dark text-sm md:col-span-2" value={newBike.videoUrl} onChange={e => setNewBike({...newBike, videoUrl: e.target.value})} aria-label="Video URL (optional, YouTube/Vimeo)" />
              <TierBuilder packages={bikePackages} onChange={setBikePackages} basePrice={newBike.pricePerHour} />
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Upload Vehicle Photos</label>
                <input type="file" multiple accept="image/jpeg,image/png" className="input-dark !py-2 !px-3 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/10 file:text-[var(--accent-text)] hover:file:bg-amber-500/20" aria-label="Upload vehicle photos" onChange={e => {
                  const files = Array.from(e.target.files || []);
                  const oversized = files.find(f => f.size > 5 * 1024 * 1024);
                  if (oversized) {
                    alert('File too large: ' + oversized.name + '. Maximum 5MB allowed.');
                    e.target.value = '';
                    return;
                  }
                  setBikeFiles(e.target.files);
                }} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary md:col-span-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><PlusCircle size={16} className="mr-2" /> Save Vehicle</>}
              </button>
            </form>
          )}

          {bikes.length === 0 ? (
            <EmptyState
              icon={BikeIcon}
              title="No vehicles yet"
              description="Add your first vehicle to start renting"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bikes.map(bike => (
                <div key={bike._id} className="glass rounded-2xl overflow-hidden card-hover">
                  {bike.images?.[0] && (
                    <img src={bike.images[0]} alt={bike.model} width="400" height="300" className="w-full h-48 object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a1a2e/666?text=No+Image'; }} />
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{bike.model}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.brand} - {bike.category?.name || 'N/A'}</p>
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
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{ background: bike.availability ? 'var(--success-bg)' : 'var(--danger-bg)', color: bike.availability ? 'var(--success-text)' : 'var(--danger-text)', borderColor: bike.availability ? 'var(--success-border)' : 'var(--danger-border)' }}>
                        {bike.availability ? 'Available' : 'Booked'}
                      </span>
                      {bike.availability ? (
                        <button onClick={() => toggleAvailability(bike._id)}
                          className="flex items-center px-3 py-2.5 min-h-11 rounded-lg text-xs font-medium transition-all border" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--success-bg)'} aria-label="Toggle vehicle availability">
                          <ToggleRight size={14} className="mr-1" /> Available
                        </button>
                      ) : (
                        <button onClick={() => toggleAvailability(bike._id)}
                          className="flex items-center px-3 py-2.5 min-h-11 rounded-lg text-xs font-medium transition-all"
                          style={{ color: 'var(--text-muted)', background: 'var(--hover-bg)', borderColor: 'var(--border-base)' }} aria-label="Toggle vehicle availability">
                          <ToggleLeft size={14} className="mr-1" /> Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <FleetOverview bikes={bikes} />
          <MaintenanceSchedule bikes={bikes} />

          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Vehicle Health</h3>
            {bikes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No vehicles to display health status</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bikes.map(bike => (
                  <VehicleHealthCard key={bike._id} bike={bike} />
                ))}
              </div>
            )}
          </div>

          {bikes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Select Vehicle for Maintenance Log</label>
                <select value={selectedBikeId || ''} onChange={e => setSelectedBikeId(e.target.value)} className="input-dark !py-1.5 !px-2.5 text-xs" aria-label="Vehicle for Maintenance Log">
                  <option value="">Choose a vehicle...</option>
                  {bikes.map(bike => (
                    <option key={bike._id} value={bike._id}>{bike.brand} {bike.model}</option>
                  ))}
                </select>
              </div>

              {selectedBikeId && (
                <>
                  <MaintenanceLogForm bikeId={selectedBikeId} onCreated={() => {
                    api.get('/dashboard/my-bikes').then(res => setBikes(res.data));
                  }} />
                  <MaintenanceHistory bikeId={selectedBikeId} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && <RenterEarnings />}
      {activeTab === 'tracking' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Live Vehicle Tracking</h2>
          </div>
          <LiveFleetMap height="500px" />
        </div>
      )}
    </div>
  );
};

export default memo(RenterDashboard);
