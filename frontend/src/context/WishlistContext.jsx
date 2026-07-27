import { createContext, useState, useCallback, useEffect } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const WishlistContext = createContext(null);

function getStored() {
  try {
    return JSON.parse(localStorage.getItem('rbc_wishlist') || '[]');
  } catch { return []; }
}

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(getStored);

  useEffect(() => {
    localStorage.setItem('rbc_wishlist', JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((bikeId) => {
    setIds(prev => prev.includes(bikeId) ? prev.filter(id => id !== bikeId) : [...prev, bikeId]);
  }, []);

  const has = useCallback((bikeId) => ids.includes(bikeId), [ids]);
  const clear = useCallback(() => setIds([]), []);
  const count = ids.length;

  return (
    <WishlistContext.Provider value={{ ids, toggle, has, clear, count }}>
      {children}
    </WishlistContext.Provider>
  );
}
