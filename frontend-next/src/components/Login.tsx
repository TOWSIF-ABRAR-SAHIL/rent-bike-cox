"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import api, { type ApiError } from '../api/axios';

import { useAuth } from '../context/useAuth';
import { Mail, Lock, LogIn } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', formData);
      login(response.data.accessToken, response.data.refreshToken, response.data.user);
      router.push('/');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.response?.status === 423) {
        const data = apiErr.response.data as { retryAfter?: number } | undefined;
        const retryAfter = data?.retryAfter || 900;
        const minutes = Math.ceil(retryAfter / 60);
        setError(`Account temporarily locked. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      } else {
        const data = apiErr.response?.data as { message?: string } | undefined;
        setError(data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-[80px]" />
      </div>
      <div className="w-full max-w-md animate-slide-up relative">
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <LogIn size={24} style={{ color: 'var(--text-primary)' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome Back</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to your account</p>
          </div>

          {error && (
            <div className="border p-3 rounded-xl mb-6 text-sm" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="email" name="email" placeholder="Email address" onChange={handleChange} className="input-dark !pl-11" required />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="password" name="password" placeholder="Password" onChange={handleChange} className="input-dark !pl-11" required />
            </div>
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--accent-text)' }}>Forgot Password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold" style={{ color: 'var(--accent-text)' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseLeave={e => e.currentTarget.style.filter = ''}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
