import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { PlusCircle, Bike as BikeIcon, ToggleLeft, ToggleRight, Loader2, X, Package } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const DURATION_OPTIONS = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

function generateDefaultPackages(pricePerHour) {
  if (!pricePerHour || pricePerHour <= 0) return [];
  return [
    { label: '1 Hour', durationType: 'hour', durationValue: 1, price: pricePerHour },
    { label: '2 Hours', durationType: 'hour', durationValue: 2, price: pricePerHour * 2 },
    { label: '4 Hours', durationType: 'hour', durationValue: 4, price: pricePerHour * 4 },
    { label: '1 Day', durationType: 'day', durationValue: 1, price: Math.round(pricePerHour * 10) },
    { label: '1 Week', durationType: 'week', durationValue: 1, price: Math.round(pricePerHour * 50) },
  ];
}

const PackageBuilder = ({ packages, onChange, basePrice }) => {
  const addPackage = () => {
    onChange([...packages, { label: '', durationType: 'hour', durationValue: 1, price: 0 }]);
  };

  const updatePackage = (index, field, value) => {
    const updated = packages.map((pkg, i) => i === index ? { ...pkg, [field]: value } : pkg);
    onChange(updated);
  };

  const removePackage = (index) => {
    onChange(packages.filter((_, i) => i !== index));
  };

  const autoGenerate = (basePrice) => {
    onChange(generateDefaultPackages(basePrice));
  };

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium uppercase tracking-wide flex items-center" style={{ color: 'var(--text-secondary)' }}>
          <Package size={14} className="mr-1.5" /> Pricing Packages
        </label>
        <button type="button" onClick={() => autoGenerate(basePrice || 200)}
          className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:opacity-80"
          style={{ color: 'var(--accent-text)', borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}>
          Auto-Generate
        </button>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Define custom packages for this vehicle. Leave empty to use hourly rate only.</p>

      {packages.length > 0 && (
        <div className="space-y-2 mb-3">
          {packages.map((pkg, i) => (
            <div key={i} className="flex gap-2 items-start p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)' }}>
              <input type="text" placeholder="Label (e.g. 1 Day)" value={pkg.label}
                onChange={e => updatePackage(i, 'label', e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-28" />
              <input type="number" placeholder="Qty" min="1" value={pkg.durationValue}
                onChange={e => updatePackage(i, 'durationValue', Number(e.target.value) || 1)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-16" />
              <select value={pkg.durationType}
                onChange={e => updatePackage(i, 'durationType', e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-20">
                {DURATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <input type="number" placeholder="Price (TK)" min="0" value={pkg.price}
                onChange={e => updatePackage(i, 'price', Number(e.target.value) || 0)}
                className="input-dark !py-1.5 !px-2.5 text-xs flex-shrink-0 w-24" />
              <button type="button" onClick={() => removePackage(i)}
                className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                style={{ color: 'var(--danger-text)' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addPackage}
        className="w-full py-2 rounded-xl border-2 border-dashed text-xs font-medium transition-all hover:opacity-80"
        style={{ borderColor: 'var(--border-base)', color: 'var(--text-muted)' }}>
        + Add Package
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
  const [newBike, setNewBike] = useState({
    model: '', brand: '', category: '', description: '', pricePerHour: 200, videoUrl: ''
  });
  const [bikePackages, setBikePackages] = useState([]);
  const [bikeFiles, setBikeFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/my-bikes'),
      api.get('/dashboard/categories')
    ]).then(([bikesRes, catsRes]) => {
      setBikes(bikesRes.data);
      setCategories(catsRes.data);
      if (catsRes.data.length > 0) setNewBike(prev => ({ ...prev, category: catsRes.data[0]._id }));
    }).catch(() => { addToast('Failed to fetch data', 'error'); setFetchError('Failed to load dashboard data.'); })
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formDataToSend = new FormData();
    Object.keys(newBike).forEach(key => { if (newBike[key]) formDataToSend.append(key, newBike[key]); });
    if (bikePackages.length > 0) {
      const cleanPackages = bikePackages.map(({ label, durationType, durationValue, price }) => ({ label, durationType, durationValue, price }));
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
        <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center">
          <PlusCircle className="mr-2" size={20} /> Add New Vehicle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Model" className="input-dark text-sm" value={newBike.model} onChange={e => setNewBike({...newBike, model: e.target.value})} required />
          <input type="text" placeholder="Brand" className="input-dark text-sm" value={newBike.brand} onChange={e => setNewBike({...newBike, brand: e.target.value})} required />
          <select className="input-dark text-sm" value={newBike.category} onChange={e => setNewBike({...newBike, category: e.target.value})} required>
            {categories.map(cat => <option key={cat._id} value={cat._id} style={{ background: 'var(--bg-surface)' }}>{cat.name}</option>)}
          </select>
          <input type="number" placeholder="Price Per Hour" className="input-dark text-sm" value={newBike.pricePerHour} onChange={e => setNewBike({...newBike, pricePerHour: Number(e.target.value) || 0})} required />
          <textarea placeholder="Description" className="input-dark text-sm md:col-span-2 min-h-[80px] resize-none" value={newBike.description} onChange={e => setNewBike({...newBike, description: e.target.value})} required />
          <input type="text" placeholder="Video URL (optional, YouTube/Vimeo)" className="input-dark text-sm md:col-span-2" value={newBike.videoUrl} onChange={e => setNewBike({...newBike, videoUrl: e.target.value})} />
          <PackageBuilder packages={bikePackages} onChange={setBikePackages} basePrice={newBike.pricePerHour} />
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Upload Vehicle Photos</label>
            <input type="file" multiple accept="image/jpeg,image/png" className="input-dark !py-2 !px-3 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/10 file:text-[var(--accent-text)] hover:file:bg-amber-500/20" onChange={e => {
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
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{bike.packages.length} packages</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{ background: bike.availability ? 'var(--success-bg)' : 'var(--danger-bg)', color: bike.availability ? 'var(--success-text)' : 'var(--danger-text)', borderColor: bike.availability ? 'var(--success-border)' : 'var(--danger-border)' }}>
                    {bike.availability ? 'Available' : 'Booked'}
                  </span>
                  {bike.availability ? (
                    <button onClick={() => toggleAvailability(bike._id)}
                      className="flex items-center px-3 py-2.5 min-h-11 rounded-lg text-xs font-medium transition-all border" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--success-bg)'}>
                      <ToggleRight size={14} className="mr-1" /> Available
                    </button>
                  ) : (
                    <button onClick={() => toggleAvailability(bike._id)}
                      className="flex items-center px-3 py-2.5 min-h-11 rounded-lg text-xs font-medium transition-all"
                      style={{ color: 'var(--text-muted)', background: 'var(--hover-bg)', borderColor: 'var(--border-base)' }}>
                      <ToggleLeft size={14} className="mr-1" /> Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RenterDashboard;
