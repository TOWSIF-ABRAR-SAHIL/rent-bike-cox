"use client";

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/useAuth';
import PageSpinner from './PageSpinner';

export default function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const denied = !loading && (!token || (roles && user && !roles.includes(user.role)));

  useEffect(() => {
    if (loading) return;
    if (!token) router.replace('/login');
    else if (roles && user && !roles.includes(user.role)) router.replace('/');
  }, [loading, token, user, roles, router]);

  if (loading) return <PageSpinner />;
  if (!token) return <PageSpinner />;
  if (roles && user && !roles.includes(user.role)) return <PageSpinner />;

  return children;
}
