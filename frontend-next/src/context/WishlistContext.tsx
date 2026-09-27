"use client";

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

export interface WishlistContextValue {
  ids: string[];
  toggle: (bikeId: string) => void;
  has: (bikeId: string) => boolean;
  clear: () => void;
  count: number;
}

export const WishlistContext = createContext<WishlistContextValue | null>(null);

function getStored(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('rbc_wishlist') || '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(getStored);

  useEffect(() => {
    localStorage.setItem('rbc_wishlist', JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((bikeId: string) => {
    setIds((prev) =>
      prev.includes(bikeId) ? prev.filter((id) => id !== bikeId) : [...prev, bikeId]
    );
  }, []);

  const has = useCallback((bikeId: string) => ids.includes(bikeId), [ids]);
  const clear = useCallback(() => setIds([]), []);
  const count = ids.length;

  return (
    <WishlistContext.Provider value={{ ids, toggle, has, clear, count }}>
      {children}
    </WishlistContext.Provider>
  );
}
