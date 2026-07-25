import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

const AuthContext = createContext(null);
export { AuthContext };

function getInitialUser() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }
    return decoded;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
  const refreshTimeout = useRef(null);

  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    try {
      const decoded = jwtDecode(accessToken);
      const expiresIn = (decoded.exp * 1000) - Date.now() - 60000;
      if (expiresIn > 0) {
        refreshTimeout.current = setTimeout(async () => {
          try {
            const rt = localStorage.getItem('refreshToken');
            if (!rt) return;
            const res = await api.post('/auth/refresh', { refreshToken: rt });
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
            localStorage.setItem('accessToken', newAccess);
            localStorage.setItem('refreshToken', newRefresh);
            setToken(newAccess);
            setUser(jwtDecode(newAccess));
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setUser(null);
          }
        }, expiresIn);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('accessToken');
    if (stored) scheduleRefresh(stored);
    return () => { if (refreshTimeout.current) clearTimeout(refreshTimeout.current); };
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
  }, []);

  const login = useCallback((accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setToken(accessToken);
    try {
      const decoded = jwtDecode(accessToken);
      setUser(decoded);
      scheduleRefresh(accessToken);
    } catch {
      setUser(null);
    }
  }, [scheduleRefresh]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
