import { useContext } from 'react';
import { CompareContext } from './CompareContext';

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
