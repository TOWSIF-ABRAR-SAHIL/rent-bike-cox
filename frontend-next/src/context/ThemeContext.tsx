"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { ThemeMode, ResolvedTheme } from '@/types';

export interface ThemeContextValue {
  theme: ThemeMode;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
export { ThemeContext };

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return null;
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme !== 'system') return theme;
  // The S-Rent design is the light layout, so an unknown/system preference
  // still resolves to light on the server (no dark flash before hydration).
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Fixed 'light' first render on BOTH server and client so hydration matches;
  // the stored preference syncs in an effect right after mount (no visual
  // flash: applyTheme runs before paint on the same commit). Light is the
  // default because the product design (figma/) is the light S-Rent layout.
  const [theme, setTheme] = useState<ThemeMode>('light');

  const resolved = resolveTheme(theme);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored && stored !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(resolved);
    localStorage.setItem('theme', theme);
  }, [theme, resolved]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (): void => {
      applyTheme(mq.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}
