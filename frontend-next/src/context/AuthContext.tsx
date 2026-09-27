"use client";

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '@/api/axios';
import type { AuthUser, AuthTokens, JwtPayload, StoredUser } from '@/types';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData?: StoredUser) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export { AuthContext };

function mergeUser(decoded: JwtPayload, storedRaw: string | null): AuthUser {
  if (storedRaw) {
    try {
      const stored = JSON.parse(storedRaw) as StoredUser;
      return { ...decoded, ...stored };
    } catch {
      return decoded;
    }
  }
  return decoded;
}

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return null;
    }
    return mergeUser(decoded, localStorage.getItem('user'));
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // NOTE: intentionally NOT initialized from localStorage. The server
  // prerender has no access to it, so initializing here would produce a
  // different first render on the client -> React hydration mismatch.
  // The session is restored in the mount effect below instead.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimeout = useRef<number | null>(null);

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
    try {
      const decoded = jwtDecode<JwtPayload>(accessToken);
      const expiresIn = decoded.exp * 1000 - Date.now() - 60000;
      if (expiresIn > 0) {
        refreshTimeout.current = window.setTimeout(async () => {
          try {
            const rt = localStorage.getItem('refreshToken');
            if (!rt) return;
            const res = await api.post<AuthTokens>('/auth/refresh', { refreshToken: rt });
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
            localStorage.setItem('accessToken', newAccess);
            localStorage.setItem('refreshToken', newRefresh);
            setToken(newAccess);
            const newDecoded = jwtDecode<JwtPayload>(newAccess);
            setUser(mergeUser(newDecoded, localStorage.getItem('user')));
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }, expiresIn);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('accessToken');
    if (stored) {
      setToken(stored);
      setUser(getInitialUser());
      scheduleRefresh(stored);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional session restore on mount
    setLoading(false);
    return () => {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
    };
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current);
  }, []);

  const login = useCallback(
    (accessToken: string, refreshToken: string, userData?: StoredUser) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        const fullUser: AuthUser = { ...decoded, ...userData };
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
        setUser(fullUser);
        scheduleRefresh(accessToken);
      } catch {
        setUser(null);
      }
    },
    [scheduleRefresh]
  );

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get<{ user?: StoredUser }>('/auth/profile');
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser((prev) => (prev ? { ...prev, ...res.data.user } : prev));
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
