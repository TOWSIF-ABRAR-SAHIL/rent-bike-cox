import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { useToast } from '../components/useToast';
import { User, Phone, MapPin, Shield, Camera, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Profile = () => {
  const { refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nidPreview, setNidPreview] = useState('');
  const [licensePreview, setLicensePreview] = useState('');
  const nidInputRef = useRef(null);
  const licenseInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    nidImage: null,
    licenseImage: null,
  });

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => {
        const user = data.user || data;
        setProfile(user);
        setForm(f => ({
          ...f,
          name: user.name || '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
        }));
        setNidPreview(user.nidImage || '');
        setLicensePreview(user.licenseImage || '');
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size must be under 5MB', 'error');
      return;
    }
    setForm(f => ({ ...f, [field]: file }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (field === 'nidImage') setNidPreview(ev.target.result);
      else setLicensePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phoneNumber', form.phoneNumber);
      formData.append('address', form.address);
      if (form.nidImage) formData.append('nidImage', form.nidImage);
      if (form.licenseImage) formData.append('licenseImage', form.licenseImage);

      await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProfile();
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
      <Loader2 size={20} className="animate-spin inline-block mr-2" /> Loading profile...
    </div>
  );

  if (error && !profile) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center glass rounded-2xl p-8">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--danger-text)' }} />
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary" aria-label="Retry loading profile">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <User size={28} style={{ color: 'var(--accent-text)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Profile</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your account details</p>
        </div>
      </div>

      {error && (
        <div className="border p-3 rounded-xl mb-6 text-sm flex items-center gap-2"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User size={18} /> Personal Information
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              required
              aria-label="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="w-full px-4 py-3 rounded-xl opacity-60 cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              aria-label="Email (read-only)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><Phone size={14} /> Phone Number</span>
            </label>
            <input
              type="text"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="e.g. +880 1XXXXXXXXX"
              className="w-full px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              aria-label="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><MapPin size={14} /> Address</span>
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Your address"
              rows={3}
              className="w-full px-4 py-3 rounded-xl resize-none"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              aria-label="Address"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}>
                <Shield size={14} /> {profile?.role || 'User'}
              </span>
            </div>
            {profile?.isVerified !== undefined && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Verified</label>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    background: profile.isVerified ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: profile.isVerified ? 'var(--success-text)' : 'var(--warning-text)',
                    border: `1px solid ${profile.isVerified ? 'var(--success-border)' : 'var(--warning-border)'}`,
                  }}>
                  {profile.isVerified ? <><CheckCircle size={14} /> Verified</> : <><AlertCircle size={14} /> Not Verified</>}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Camera size={18} /> Documents
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>NID Image</label>
            <div className="flex items-center gap-4">
              {nidPreview && (
                <img src={nidPreview} alt="NID preview" className="w-24 h-24 rounded-xl object-cover border flex-shrink-0"
                  style={{ borderColor: 'var(--border-color)' }} onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  ref={nidInputRef}
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => handleFileChange(e, 'nidImage')}
                  className="w-full text-sm px-4 py-3 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  aria-label="Upload NID image"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>License Image</label>
            <div className="flex items-center gap-4">
              {licensePreview && (
                <img src={licensePreview} alt="License preview" className="w-24 h-24 rounded-xl object-cover border flex-shrink-0"
                  style={{ borderColor: 'var(--border-color)' }} onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  ref={licenseInputRef}
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => handleFileChange(e, 'licenseImage')}
                  className="w-full text-sm px-4 py-3 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  aria-label="Upload license image"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          aria-label="Save profile changes"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
};

export default Profile;
