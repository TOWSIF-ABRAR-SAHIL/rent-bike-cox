import { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);
export { AuthContext };

function getInitialAuth() {
  const token = localStorage.getItem('token');
  if (!token) return { user: null, token: null };
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem('token');
      return { user: null, token: null };
    }
    return { user: decoded, token };
  } catch {
    localStorage.removeItem('token');
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [{ user, token }, setAuth] = useState(getInitialAuth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuth({ user: null, token: null });
  }, []);

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    try {
      const decoded = jwtDecode(newToken);
      setAuth({ user: decoded, token: newToken });
    } catch {
      setAuth({ user: null, token: null });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
