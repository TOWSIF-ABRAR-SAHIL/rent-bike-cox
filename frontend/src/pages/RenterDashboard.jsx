import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { PlusCircle, Bike as BikeIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';

const RenterDashboard = () => {
  const { addToast } = useToast();
  const [bikes, setBikes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newBike, setNewBike] = useState({
    model: '', brand: '', category: '', description: '', pricePerHour: 200, videoUrl: ''
  });
  const [bikeFiles, setBikeFiles] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/my-bikes'),
      api.get('/dashboard/categories')
    ]).then(([bikesRes, catsRes]) => {
      setBikes(bikesRes.data);
      setCategories(catsRes.data);
      if (catsRes.data.length > 0) setNewBike(prev => ({ ...prev, category: catsRes.data[0]._id }));
    }).catch(() => addToast('Failed to fetch data', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    Object.keys(newBike).forEach(key => { if (newBike[key]) formDataToSend.append(key, newBike[key]); });
    Array.from(bikeFiles).forEach(file => formDataToSend.append('bikeImages', file));
    try {
      await api.post('/dashboard/bikes', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setNewBike({ model: '', brand: '', category: categories[0]?._id || '', description: '', pricePerHour: 200, videoUrl: '' });
      setBikeFiles([]);
      const res = await api.get('/dashboard/my-bikes');
      setBikes(res.data);
      addToast('Bike added successfully!', 'success');
    } catch { addToast('Failed to add bike', 'error'); }
  }, [newBike, bikeFiles, categories, addToast]);

  const toggleAvailability = useCallback(async (bikeId) => {
    try {
      const res = await api.put(`/dashboard/bikes/${bikeId}/availability`);
      setBikes(bikes.map(bike => bike._id === bikeId ? { ...bike, availability: res.data.bike.availability } : bike));
      addToast(`Bike is now ${res.data.bike.availability ? 'available' : 'unavailable'}`, 'success');
    } catch { addToast('Failed to update availability', 'error'); }
  }, [bikes, addToast]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Renter Dashboard</h1>
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
          <input type="number" placeholder="Price Per Hour" className="input-dark text-sm" value={newBike.pricePerHour} onChange={e => setNewBike({...newBike, pricePerHour: e.target.value})} required />
          <textarea placeholder="Description" className="input-dark text-sm md:col-span-2 min-h-[80px] resize-none" value={newBike.description} onChange={e => setNewBike({...newBike, description: e.target.value})} required />
          <input type="text" placeholder="Video URL (optional, YouTube/Vimeo)" className="input-dark text-sm md:col-span-2" value={newBike.videoUrl} onChange={e => setNewBike({...newBike, videoUrl: e.target.value})} />
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Upload Vehicle Photos</label>
            <input type="file" multiple className="input-dark !py-2 !px-3 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-500/10 file:text-cyan-400 hover:file:bg-primary-500/20" onChange={e => setBikeFiles(e.target.files)} />
          </div>
          <button type="submit" className="btn-primary md:col-span-2 flex items-center justify-center">
            <PlusCircle size={16} className="mr-2" /> Save Vehicle
          </button>
        </form>
      )}

      {bikes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BikeIcon size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>No vehicles yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add your first vehicle to start renting</p>
        </div>
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
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{bike.model}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.brand} - {bike.category?.name || 'N/A'}</p>
                    <p className="text-cyan-400 font-semibold text-sm mt-1">{bike.pricePerHour} TK/hr</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${bike.availability ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {bike.availability ? 'Available' : 'Booked'}
                  </span>
                  {bike.availability ? (
                    <button onClick={() => toggleAvailability(bike._id)}
                      className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
                      <ToggleRight size={14} className="mr-1" /> Available
                    </button>
                  ) : (
                    <button onClick={() => toggleAvailability(bike._id)}
                      className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-400"
                      style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-base)' }}>
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
