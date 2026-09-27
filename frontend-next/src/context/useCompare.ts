"use client";

import { useContext } from 'react';
import { CompareContext, type CompareContextValue } from './CompareContext';

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
