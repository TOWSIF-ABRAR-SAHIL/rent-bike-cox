import { useState, memo } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import api from '../api/axios';

const CATEGORIES = ['general', 'booking', 'payment', 'technical', 'complaint', 'suggestion', 'other'];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', category: 'general' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
        <CheckCircle size={32} style={{ color: 'var(--success-text)' }} />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Message Sent!</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>We&apos;ll get back to you within 24 hours. For urgent inquiries, reach us on WhatsApp.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: '', message: '', category: 'general' }); }} className="btn-primary text-sm">Send Another</button>
        <a href="https://wa.me/880189154443" target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }}>WhatsApp Instead</a>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
          <Mail size={28} style={{ color: 'var(--accent-text)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Contact Us</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Have a question or need help? We&apos;re here for you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Phone size={18} style={{ color: 'var(--accent-text)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Phone</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>01891-54443</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>01764-466757</p>
          </div>
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Mail size={18} style={{ color: 'var(--accent-text)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Email</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>info@rentbikecox.com</p>
          </div>
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex items-center gap-3 mb-3">
              <MapPin size={18} style={{ color: 'var(--accent-text)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Location</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kolatoli, Cox&apos;s Bazar<br />Bangladesh</p>
          </div>
          <a href="https://wa.me/880189154443" target="_blank" rel="noopener noreferrer"
            className="block glass rounded-2xl p-5 border text-center transition-all hover:opacity-90"
            style={{ borderColor: '#25D366', background: '#25D36615' }}>
            <p className="text-sm font-semibold" style={{ color: '#25D366' }}>Chat on WhatsApp</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Fastest response</p>
          </a>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 border space-y-4" style={{ borderColor: 'var(--border-base)' }}>
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required className="input-dark text-sm w-full" placeholder="Your name" aria-label="Your name" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="input-dark text-sm w-full" placeholder="you@email.com" aria-label="Your email" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-dark text-sm w-full" placeholder="01XXXXXXXXX" aria-label="Phone number" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-dark text-sm w-full" aria-label="Message category">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Subject</label>
              <input type="text" name="subject" value={form.subject} onChange={handleChange} className="input-dark text-sm w-full" placeholder="How can we help?" aria-label="Subject" />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-secondary)' }}>Message *</label>
              <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="input-dark text-sm w-full" placeholder="Tell us more..." aria-label="Your message" />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 text-sm" aria-label="Send message">
              <Send size={16} /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default memo(Contact);
