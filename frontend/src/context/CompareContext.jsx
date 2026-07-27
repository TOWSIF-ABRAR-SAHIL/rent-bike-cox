import { createContext, useState, useCallback } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const CompareContext = createContext(null);

const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [items, setItems] = useState([]);

  const add = useCallback((bike) => {
    setItems(prev => {
      if (prev.find(b => b._id === bike._id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, bike];
    });
  }, []);

  const remove = useCallback((bikeId) => {
    setItems(prev => prev.filter(b => b._id !== bikeId));
  }, []);

  const toggle = useCallback((bike) => {
    setItems(prev => {
      if (prev.find(b => b._id === bike._id)) return prev.filter(b => b._id !== bike._id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, bike];
    });
  }, []);

  const has = useCallback((bikeId) => items.some(b => b._id === bikeId), [items]);

  const clear = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider value={{ items, add, remove, toggle, has, clear, max: MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}
