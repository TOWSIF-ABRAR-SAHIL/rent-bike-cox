import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/useToast';
import { Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [strength, setStrength] = useState({ score: 0, label: '', color: '' });

  const checkStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--danger-text)', 'var(--warning-text)', 'var(--info-text)', 'var(--success-text)'];
    setStrength({
      score,
      label: pw.length > 0 ? labels[score - 1] || 'Too short' : '',
      color: pw.length > 0 ? colors[score - 1] || 'var(--danger-text)' : '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (name === 'newPassword') checkStrength(value);
      return updated;
    });
  };

  const validate = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      setError('New password must contain at least one uppercase letter');
      return false;
    }
    if (!/[0-9]/.test(form.newPassword)) {
      setError('New password must contain at least one number');
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(form.newPassword)) {
      setError('New password must contain at least one special character');
      return false;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      addToast('Password changed successfully. Please login again.', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStrength({ score: 0, label: '', color: '' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Lock size={28} style={{ color: 'var(--accent-text)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Change Password</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Update your account password</p>
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
            <Lock size={18} /> Password Details
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showCurrent ? 'text' : 'password'}
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                className="w-full px-4 py-3 pl-11 pr-12 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                required
                autoComplete="current-password"
                aria-label="Current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className="w-full px-4 py-3 pl-11 pr-12 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                required
                autoComplete="new-password"
                aria-label="New password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {strength.label && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Must be 8+ characters with uppercase, number, and special character
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 pl-11 pr-12 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                required
                autoComplete="new-password"
                aria-label="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.confirmPassword && form.newPassword === form.confirmPassword && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--success-text)' }}>
                <CheckCircle size={12} /> Passwords match
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          aria-label="Change password"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Changing...</> : <><Save size={18} /> Change Password</>}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        <Link to="/" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-text)' }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </p>
    </div>
  );
};

export default ChangePassword;
