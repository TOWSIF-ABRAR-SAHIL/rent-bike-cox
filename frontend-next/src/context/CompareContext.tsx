"use client";

import { createContext, useState, useCallback, type ReactNode } from 'react';
import type { Bike } from '@/types';

export interface CompareContextValue {
  items: Bike[];
  add: (bike: Bike) => void;
  remove: (bikeId: string) => void;
  toggle: (bike: Bike) => void;
  has: (bikeId: string) => boolean;
  clear: () => void;
  max: number;
}

export const CompareContext = createContext<CompareContextValue | null>(null);

const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Bike[]>([]);

  const add = useCallback((bike: Bike) => {
    setItems((prev) => {
      if (prev.find((b) => b._id === bike._id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, bike];
    });
  }, []);

  const remove = useCallback((bikeId: string) => {
    setItems((prev) => prev.filter((b) => b._id !== bikeId));
  }, []);

  const toggle = useCallback((bike: Bike) => {
    setItems((prev) => {
      if (prev.find((b) => b._id === bike._id)) return prev.filter((b) => b._id !== bike._id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, bike];
    });
  }, []);

  const has = useCallback((bikeId: string) => items.some((b) => b._id === bikeId), [items]);

  const clear = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider value={{ items, add, remove, toggle, has, clear, max: MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}
