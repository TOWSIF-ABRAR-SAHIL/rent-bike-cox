import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Palette, Save } from 'lucide-react';

const BrandingTab = () => {
  const { addToast } = useToast();
  const [branding, setBranding] = useState({
    businessName: '',
    businessTagline: '',
    businessAddress: '',
    contactNumbers: [],
    contactEmail: '',
    primaryColor: '#F97316',
    secondaryColor: '',
    accentColor: '',
    logoUrl: '',
    faviconUrl: '',
    heroImageUrl: '',
    socialLinks: { facebook: '', instagram: '', youtube: '', whatsapp: '', tiktok: '' },
    metaTags: { siteTitle: '', siteDescription: '', ogImage: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/branding');
      setBranding(prev => ({ ...prev, ...res.data }));
    } catch {
      addToast('Failed to load branding', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBranding(); }, [fetchBranding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/dashboard/admin/branding', branding);
      addToast('Branding updated!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addNumber = () => {
    if (newNumber && !branding.contactNumbers.includes(newNumber)) {
      setBranding(prev => ({ ...prev, contactNumbers: [...prev.contactNumbers, newNumber] }));
      setNewNumber('');
    }
  };

  const removeNumber = (num) => {
    setBranding(prev => ({ ...prev, contactNumbers: prev.contactNumbers.filter(n => n !== num) }));
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Palette size={20} style={{ color: 'var(--accent-text)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Branding & Appearance</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Customize your site colors, logo, and business info.</p>
      </div>

      {/* Business Info */}
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Business Information</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Business Name</label>
            <input type="text" value={branding.businessName} onChange={e => setBranding({ ...branding, businessName: e.target.value })} className="input-dark text-sm w-full" aria-label="Business Name" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tagline</label>
            <input type="text" value={branding.businessTagline} onChange={e => setBranding({ ...branding, businessTagline: e.target.value })} className="input-dark text-sm w-full" aria-label="Business Tagline" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Address</label>
            <input type="text" value={branding.businessAddress} onChange={e => setBranding({ ...branding, businessAddress: e.target.value })} className="input-dark text-sm w-full" aria-label="Business Address" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Contact Numbers</label>
            <div className="flex gap-2">
              <input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value)} className="input-dark text-sm flex-1" placeholder="01XXXXXXXXX" aria-label="Add phone number" />
              <button onClick={addNumber} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {branding.contactNumbers.map(num => (
                <span key={num} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>
                  {num}
                  <button onClick={() => removeNumber(num)} className="ml-1 hover:opacity-70" aria-label={`Remove ${num}`}>×</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={branding.contactEmail} onChange={e => setBranding({ ...branding, contactEmail: e.target.value })} className="input-dark text-sm w-full" aria-label="Contact Email" />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Colors</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[['primaryColor', 'Primary'], ['secondaryColor', 'Secondary'], ['accentColor', 'Accent']].map(([field, label]) => (
            <div key={field}>
              <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={branding[field] || '#000000'} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={branding[field]} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="input-dark text-sm flex-1" aria-label={`${label} color hex`} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: branding.primaryColor || '#F97316', background: `${branding.primaryColor || '#F97316'}15` }}>
          <p className="text-sm font-medium" style={{ color: branding.primaryColor || '#F97316' }}>Preview: Primary Color</p>
        </div>
      </div>

      {/* Image URLs */}
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Images</h4>
        <div className="space-y-3">
          {[['logoUrl', 'Logo URL'], ['faviconUrl', 'Favicon URL'], ['heroImageUrl', 'Hero Image URL']].map(([field, label]) => (
            <div key={field}>
              <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <input type="url" value={branding[field] || ''} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="input-dark text-sm w-full" placeholder="https://..." aria-label={label} />
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Social Links</h4>
        <div className="space-y-3">
          {Object.keys(branding.socialLinks || {}).map(platform => (
            <div key={platform}>
              <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{platform}</label>
              <input type="url" value={branding.socialLinks[platform]} onChange={e => setBranding({ ...branding, socialLinks: { ...branding.socialLinks, [platform]: e.target.value } })} className="input-dark text-sm w-full" placeholder={`https://${platform}.com/...`} aria-label={`${platform} URL`} />
            </div>
          ))}
        </div>
      </div>

      {/* Meta Tags */}
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>SEO Meta Tags</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Site Title</label>
            <input type="text" value={branding.metaTags?.siteTitle || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, siteTitle: e.target.value } })} className="input-dark text-sm w-full" aria-label="Meta site title" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Site Description</label>
            <textarea value={branding.metaTags?.siteDescription || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, siteDescription: e.target.value } })} className="input-dark text-sm w-full" rows={2} aria-label="Meta site description" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>OG Image URL</label>
            <input type="url" value={branding.metaTags?.ogImage || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, ogImage: e.target.value } })} className="input-dark text-sm w-full" placeholder="https://..." aria-label="OG Image URL" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" aria-label="Save branding">
        <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
      </button>
    </div>
  );
};

export default BrandingTab;
