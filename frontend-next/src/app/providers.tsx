"use client";

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { CompareProvider } from '@/context/CompareContext';
import { WishlistProvider } from '@/context/WishlistContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <CompareProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </CompareProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
