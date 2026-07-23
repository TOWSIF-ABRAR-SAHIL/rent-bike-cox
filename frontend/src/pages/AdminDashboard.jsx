import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Settings, Tag, Users, Bike, CheckCircle, XCircle, Plus, Trash2, FolderOpen } from 'lucide-react';
import { useToast } from '../components/useToast';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button onClick={onClick}
    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      active ? 'gradient-primary shadow-lg shadow-amber-500/25' : 'glass'
    }`}
    style={active ? { color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
    onMouseEnter={!active ? e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; } : undefined}
    onMouseLeave={!active ? e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; } : undefined}>
    <Icon className="mr-2" size={16} /> {children}
  </button>
);

const StatCard = ({ label, value, colorStyle }) => (
  <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    <p className="text-2xl font-bold" style={colorStyle}>{value}</p>
  </div>
);

const AdminDashboard = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState({ basePricePerHour: 200, packages: [] });
  const [bikes, setBikes] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' });
  const [newCategory, setNewCategory] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/settings'),
      api.get('/dashboard/admin/bikes'),
      api.get('/dashboard/admin/users'),
      api.get('/coupons'),
      api.get('/dashboard/admin/categories')
    ]).then(([settingsRes, bikesRes, usersRes, couponsRes, categoriesRes]) => {
      setSettings(settingsRes.data);
      setBikes(bikesRes.data);
      setUsers(usersRes.data);
      setCoupons(couponsRes.data);
      setCategories(categoriesRes.data);
    }).catch(() => {
      addToast('Failed to fetch data', 'error');
      setFetchError('Failed to load dashboard data. Please try again.');
    })
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleUpdateSettings = useCallback(async (e) => {
    e.preventDefault();
    try {
      await api.put('/dashboard/admin/settings', settings);
      addToast('Settings updated!', 'success');
    } catch { addToast('Failed to update settings', 'error'); }
  }, [settings, addToast]);

  const toggleBikeVerification = useCallback(async (bikeId) => {
    try {
      await api.put(`/dashboard/admin/bikes/${bikeId}/verify`);
      setBikes(prev => prev.map(b => b._id === bikeId ? { ...b, isVerified: !b.isVerified } : b));
      addToast('Bike updated', 'success');
    } catch { addToast('Failed', 'error'); }
  }, [addToast]);

  const toggleUserVerification = useCallback(async (userId) => {
    try {
      await api.put(`/dashboard/admin/users/${userId}/verify`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isVerified: !u.isVerified } : u));
      addToast('User updated', 'success');
    } catch { addToast('Failed', 'error'); }
  }, [addToast]);

  const handleCreateCoupon = useCallback(async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/coupons', newCoupon);
      setCoupons(prev => [res.data, ...prev]);
      setNewCoupon({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' });
      addToast('Coupon created!', 'success');
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  }, [newCoupon, addToast]);

  const handleDeleteCoupon = useCallback(async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c._id !== id));
      addToast('Deleted', 'success');
    } catch { addToast('Failed', 'error'); }
  }, [addToast]);

  const toggleCouponActive = useCallback(async (id, isActive) => {
    try {
      await api.put(`/coupons/${id}`, { isActive: !isActive });
      setCoupons(prev => prev.map(c => c._id === id ? { ...c, isActive: !isActive } : c));
      addToast('Updated', 'success');
    } catch { addToast('Failed', 'error'); }
  }, [addToast]);

  const handleCreateCategory = useCallback(async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/dashboard/admin/categories', { name: newCategory });
      setCategories(prev => [...prev, res.data]);
      setNewCategory('');
      addToast('Category added!', 'success');
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  }, [newCategory, addToast]);

  const handleDeleteCategory = useCallback(async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      await api.delete(`/dashboard/admin/categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
      addToast('Deleted', 'success');
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  }, [addToast]);

  const toggleCategoryActive = useCallback(async (id, isActive) => {
    try {
      const res = await api.put(`/dashboard/admin/categories/${id}`, { isActive: !isActive });
      setCategories(prev => prev.map(c => c._id === id ? res.data : c));
      addToast('Updated', 'success');
    } catch { addToast('Failed', 'error'); }
  }, [addToast]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="skeleton h-8 rounded-lg w-48" />
      <div className="skeleton h-4 rounded-lg w-full max-w-96" />
      <SkeletonTable rows={4} cols={5} />
    </div>
  );

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your rental platform</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Vehicles" value={bikes.length} colorStyle={{ color: 'var(--info-text)' }} />
        <StatCard label="Users" value={users.length} colorStyle={{ color: 'var(--success-text)' }} />
        <StatCard label="Coupons" value={coupons.length} colorStyle={{ color: 'var(--warning-text)' }} />
        <StatCard label="Categories" value={categories.length} colorStyle={{ color: 'var(--purple-text)' }} />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings}>Settings</TabButton>
        <TabButton active={activeTab === 'bikes'} onClick={() => setActiveTab('bikes')} icon={Bike}>Bikes</TabButton>
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users}>Users</TabButton>
        <TabButton active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} icon={Tag}>Coupons</TabButton>
        <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={FolderOpen}>Categories</TabButton>
      </div>

      {activeTab === 'settings' && (
        <div className="glass p-6 rounded-2xl max-w-xl">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Global Pricing</h2>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Base Price Per Hour (TK)</label>
              <input type="number" value={settings.basePricePerHour} onChange={e => setSettings({...settings, basePricePerHour: Number(e.target.value) || 0})} className="input-dark" />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>
        </div>
      )}

      {activeTab === 'bikes' && (
        bikes.length === 0 ? (
          <EmptyState
            icon={Bike}
            title="No vehicles yet"
            description="No vehicles have been added to the platform yet."
          />
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {bikes.map(bike => (
                <div key={bike._id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bike.model}</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: bike.availability ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: bike.availability ? 'var(--success-text)' : 'var(--danger-text)',
                        borderColor: bike.availability ? 'var(--success-border)' : 'var(--danger-border)',
                      }}>
                      {bike.availability ? 'Active' : 'Booked'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>{bike.category?.name || 'N/A'}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{bike.pricePerHour} TK</span>
                  </div>
                  <div className="pt-1">
                    <button onClick={() => toggleBikeVerification(bike._id)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
                      style={{
                        background: bike.isVerified ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: bike.isVerified ? 'var(--warning-text)' : 'var(--success-text)',
                        borderColor: bike.isVerified ? 'var(--warning-border)' : 'var(--success-border)',
                      }}>
                      {bike.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block glass rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <tr>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Vehicle</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Category</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Renter</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Price</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bikes.map(bike => (
                    <tr key={bike._id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border-base)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                      <td className="p-4 font-medium" style={{ color: 'var(--text-primary)' }}>{bike.model}</td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{bike.category?.name || 'N/A'}</td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{bike.renter?.name}</td>
                      <td className="p-4 font-medium" style={{ color: 'var(--text-primary)' }}>{bike.pricePerHour} TK</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                          style={{
                            background: bike.availability ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: bike.availability ? 'var(--success-text)' : 'var(--danger-text)',
                            borderColor: bike.availability ? 'var(--success-border)' : 'var(--danger-border)',
                          }}>
                          {bike.availability ? 'Active' : 'Booked'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => toggleBikeVerification(bike._id)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
                          style={{
                            background: bike.isVerified ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: bike.isVerified ? 'var(--warning-text)' : 'var(--success-text)',
                            borderColor: bike.isVerified ? 'var(--warning-border)' : 'var(--success-border)',
                          }}>
                          {bike.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {activeTab === 'users' && (
        users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="No users have registered yet."
          />
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {users.map(user => (
                <div key={user._id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: user.role === 'Admin' ? 'var(--purple-bg)' : user.role === 'Renter' ? 'var(--info-bg)' : 'var(--hover-bg)',
                        color: user.role === 'Admin' ? 'var(--purple-text)' : user.role === 'Renter' ? 'var(--info-text)' : 'var(--text-secondary)',
                        borderColor: user.role === 'Admin' ? 'var(--purple-border)' : user.role === 'Renter' ? 'var(--info-border)' : 'var(--border-base)',
                      }}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.phoneNumber}</span>
                    <button onClick={() => toggleUserVerification(user._id)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
                      style={{
                        background: user.isVerified ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: user.isVerified ? 'var(--warning-text)' : 'var(--success-text)',
                        borderColor: user.isVerified ? 'var(--warning-border)' : 'var(--success-border)',
                      }}>
                      {user.isVerified ? <><XCircle size={14} className="inline mr-1" />Unverify</> : <><CheckCircle size={14} className="inline mr-1" />Verify</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block glass rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <tr>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Email</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Role</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Phone</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border-base)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                      <td className="p-4 font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td className="p-4">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                          style={{
                            background: user.role === 'Admin' ? 'var(--purple-bg)' : user.role === 'Renter' ? 'var(--info-bg)' : 'var(--hover-bg)',
                            color: user.role === 'Admin' ? 'var(--purple-text)' : user.role === 'Renter' ? 'var(--info-text)' : 'var(--text-secondary)',
                            borderColor: user.role === 'Admin' ? 'var(--purple-border)' : user.role === 'Renter' ? 'var(--info-border)' : 'var(--border-base)',
                          }}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{user.phoneNumber}</td>
                      <td className="p-4">
                        <button onClick={() => toggleUserVerification(user._id)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border transition-all"
                          style={{
                            background: user.isVerified ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: user.isVerified ? 'var(--warning-text)' : 'var(--success-text)',
                            borderColor: user.isVerified ? 'var(--warning-border)' : 'var(--success-border)',
                          }}>
                          {user.isVerified ? <><XCircle size={14} className="inline mr-1" />Unverify</> : <><CheckCircle size={14} className="inline mr-1" />Verify</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl max-w-xl">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create Coupon</h2>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="CODE" className="input-dark text-sm" required />
                <input type="number" value={newCoupon.discountPercent} onChange={e => setNewCoupon({...newCoupon, discountPercent: parseInt(e.target.value, 10) || 0})} min="1" max="100" placeholder="Discount %" className="input-dark text-sm" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" value={newCoupon.maxUses} onChange={e => setNewCoupon({...newCoupon, maxUses: parseInt(e.target.value, 10) || 0})} min="0" placeholder="Max uses (0=unlimited)" className="input-dark text-sm" />
                <input type="datetime-local" value={newCoupon.expiresAt} onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})} className="input-dark text-sm" />
              </div>
              <button type="submit" className="btn-primary !py-2.5 text-sm"><Plus size={16} className="inline mr-1" /> Create</button>
            </form>
          </div>
          <>
          {coupons.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No coupons yet"
              description="Create your first coupon to offer discounts."
            />
          ) : (
            <>
            <div className="md:hidden space-y-3 p-4">
              {coupons.map(c => (
                <div key={c._id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: c.isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: c.isActive ? 'var(--success-text)' : 'var(--danger-text)',
                        borderColor: c.isActive ? 'var(--success-border)' : 'var(--danger-border)',
                      }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>{c.discountPercent}% off</span>
                    <span>{c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ''} uses</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => toggleCouponActive(c._id, c.isActive)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border"
                      style={{
                        background: c.isActive ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: c.isActive ? 'var(--warning-text)' : 'var(--success-text)',
                        borderColor: c.isActive ? 'var(--warning-border)' : 'var(--success-border)',
                      }}>
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteCoupon(c._id)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs border"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block glass rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <tr>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Code</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Discount</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Uses</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Expires</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c._id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border-base)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                      <td className="p-4 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{c.code}</td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{c.discountPercent}%</td>
                      <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ''}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                          style={{
                            background: c.isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: c.isActive ? 'var(--success-text)' : 'var(--danger-text)',
                            borderColor: c.isActive ? 'var(--success-border)' : 'var(--danger-border)',
                          }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4" style={{ color: 'var(--text-muted)' }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                      <td className="p-4 space-x-2">
                        <button onClick={() => toggleCouponActive(c._id, c.isActive)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border"
                          style={{
                            background: c.isActive ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: c.isActive ? 'var(--warning-text)' : 'var(--success-text)',
                            borderColor: c.isActive ? 'var(--warning-border)' : 'var(--success-border)',
                          }}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteCoupon(c._id)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs border"
                          style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          </>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl max-w-xl">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Category</h2>
            <form onSubmit={handleCreateCategory} className="flex gap-3">
              <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Microbus" className="input-dark flex-1 text-sm" required />
              <button type="submit" className="btn-primary !py-2.5 text-sm"><Plus size={16} className="inline mr-1" /> Add</button>
            </form>
          </div>
          <>
          {categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No categories yet"
              description="Add categories to organize your vehicles."
            />
          ) : (
            <>
            <div className="md:hidden space-y-3 p-4">
              {categories.map(cat => (
                <div key={cat._id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: cat.isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: cat.isActive ? 'var(--success-text)' : 'var(--danger-text)',
                        borderColor: cat.isActive ? 'var(--success-border)' : 'var(--danger-border)',
                      }}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{cat.slug}</div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => toggleCategoryActive(cat._id, cat.isActive)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border"
                      style={{
                        background: cat.isActive ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: cat.isActive ? 'var(--warning-text)' : 'var(--success-text)',
                        borderColor: cat.isActive ? 'var(--warning-border)' : 'var(--success-border)',
                      }}>
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteCategory(cat._id)}
                      className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs border"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block glass rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b" style={{ borderColor: 'var(--border-base)' }}>
                  <tr>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Slug</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="p-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat._id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border-base)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                      <td className="p-4 font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</td>
                      <td className="p-4" style={{ color: 'var(--text-muted)' }}>{cat.slug}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                          style={{
                            background: cat.isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: cat.isActive ? 'var(--success-text)' : 'var(--danger-text)',
                            borderColor: cat.isActive ? 'var(--success-border)' : 'var(--danger-border)',
                          }}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 space-x-2">
                        <button onClick={() => toggleCategoryActive(cat._id, cat.isActive)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-medium border"
                          style={{
                            background: cat.isActive ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: cat.isActive ? 'var(--warning-text)' : 'var(--success-text)',
                            borderColor: cat.isActive ? 'var(--warning-border)' : 'var(--success-border)',
                          }}>
                          {cat.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteCategory(cat._id)}
                          className="px-3 py-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs border"
                          style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          </>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
