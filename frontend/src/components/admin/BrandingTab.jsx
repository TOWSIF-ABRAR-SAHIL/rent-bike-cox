import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { Palette, Save, Download, Upload } from 'lucide-react';

const BrandingTab = () => {
  const { addToast } = useToast();
  const [branding, setBranding] = useState({
    businessName: '',
    businessTagline: '',
    businessAddress: '',
    contactNumbers: [],
    contactEmail: '',
    whatsappNumber: '',
    primaryColor: '#F97316',
    secondaryColor: '#8b5cf6',
    accentColor: '#f59e0b',
    successColor: '#22C55E',
    warningColor: '#EAB308',
    dangerColor: '#EF4444',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    ogImageUrl: '',
    heroImageUrl: '',
    socialLinks: { facebook: '', instagram: '', youtube: '', whatsapp: '', tiktok: '', twitter: '' },
    metaTags: { siteTitle: '', siteDescription: '', ogImage: '' },
    legal: { companyName: '', tradeLicense: '', taxId: '' },
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBranding(); }, [fetchBranding]);

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

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(branding, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branding-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    addToast('Branding exported', 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          setBranding(prev => ({ ...prev, ...data }));
          addToast('Branding loaded from file', 'success');
        } catch { addToast('Invalid JSON file', 'error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Palette size={20} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Branding & Appearance</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleImport} className="px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}><Upload size={12} /> Import</button>
            <button onClick={handleExport} className="px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}><Download size={12} /> Export</button>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Customize your site colors, logo, business info, and legal details.</p>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Business Information</h4>
        <div className="space-y-3">
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Business Name</label><input type="text" value={branding.businessName} onChange={e => setBranding({ ...branding, businessName: e.target.value })} className="input-dark text-sm w-full" aria-label="Business Name" /></div>
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tagline</label><input type="text" value={branding.businessTagline} onChange={e => setBranding({ ...branding, businessTagline: e.target.value })} className="input-dark text-sm w-full" aria-label="Tagline" /></div>
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Address</label><input type="text" value={branding.businessAddress} onChange={e => setBranding({ ...branding, businessAddress: e.target.value })} className="input-dark text-sm w-full" aria-label="Address" /></div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Contact Numbers</label>
            <div className="flex gap-2"><input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value)} className="input-dark text-sm flex-1" placeholder="01XXXXXXXXX" aria-label="Add phone number" /><button onClick={addNumber} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>Add</button></div>
            <div className="flex flex-wrap gap-2 mt-2">{branding.contactNumbers.map(num => (<span key={num} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>{num}<button onClick={() => removeNumber(num)} className="ml-1 hover:opacity-70" aria-label={`Remove ${num}`}>×</button></span>))}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Email</label><input type="email" value={branding.contactEmail} onChange={e => setBranding({ ...branding, contactEmail: e.target.value })} className="input-dark text-sm w-full" aria-label="Email" /></div>
            <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>WhatsApp Number</label><input type="text" value={branding.whatsappNumber} onChange={e => setBranding({ ...branding, whatsappNumber: e.target.value })} className="input-dark text-sm w-full" placeholder="01XXXXXXXXX" aria-label="WhatsApp Number" /></div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Colors</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ['primaryColor', 'Primary'], ['secondaryColor', 'Secondary'], ['accentColor', 'Accent'],
            ['successColor', 'Success'], ['warningColor', 'Warning'], ['dangerColor', 'Danger'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={branding[field] || '#000000'} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={branding[field]} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="input-dark text-sm flex-1" aria-label={`${label} hex`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Images</h4>
        <div className="space-y-3">
          {[['logoUrl', 'Logo URL'], ['logoDarkUrl', 'Logo Dark URL'], ['faviconUrl', 'Favicon URL'], ['ogImageUrl', 'OG Image URL'], ['heroImageUrl', 'Hero Image URL']].map(([field, label]) => (
            <div key={field}><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label><input type="url" value={branding[field] || ''} onChange={e => setBranding({ ...branding, [field]: e.target.value })} className="input-dark text-sm w-full" placeholder="https://..." aria-label={label} /></div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Social Links</h4>
        <div className="space-y-3">
          {Object.keys(branding.socialLinks || {}).map(platform => (
            <div key={platform}><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>{platform}</label><input type="url" value={branding.socialLinks[platform]} onChange={e => setBranding({ ...branding, socialLinks: { ...branding.socialLinks, [platform]: e.target.value } })} className="input-dark text-sm w-full" placeholder={`https://${platform}.com/...`} aria-label={`${platform} URL`} /></div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>SEO Meta Tags</h4>
        <div className="space-y-3">
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Site Title</label><input type="text" value={branding.metaTags?.siteTitle || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, siteTitle: e.target.value } })} className="input-dark text-sm w-full" aria-label="Site Title" /></div>
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Site Description</label><textarea value={branding.metaTags?.siteDescription || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, siteDescription: e.target.value } })} className="input-dark text-sm w-full" rows={2} aria-label="Site Description" /></div>
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>OG Image URL</label><input type="url" value={branding.metaTags?.ogImage || ''} onChange={e => setBranding({ ...branding, metaTags: { ...branding.metaTags, ogImage: e.target.value } })} className="input-dark text-sm w-full" placeholder="https://..." aria-label="OG Image URL" /></div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Legal Information</h4>
        <div className="space-y-3">
          <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Company Name</label><input type="text" value={branding.legal?.companyName || ''} onChange={e => setBranding({ ...branding, legal: { ...branding.legal, companyName: e.target.value } })} className="input-dark text-sm w-full" aria-label="Company Name" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Trade License</label><input type="text" value={branding.legal?.tradeLicense || ''} onChange={e => setBranding({ ...branding, legal: { ...branding.legal, tradeLicense: e.target.value } })} className="input-dark text-sm w-full" aria-label="Trade License" /></div>
            <div><label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Tax ID</label><input type="text" value={branding.legal?.taxId || ''} onChange={e => setBranding({ ...branding, legal: { ...branding.legal, taxId: e.target.value } })} className="input-dark text-sm w-full" aria-label="Tax ID" /></div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" aria-label="Save all branding">
        <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
      </button>
    </div>
  );
};

export default BrandingTab;
