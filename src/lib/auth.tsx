import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import { AuthContext, type AuthContextValue } from './auth-context';
import { clearPendingOAuth } from './oauth';
import { clearPersistedState } from './mock/state';
import type { AuthResponse, User } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(() => getToken() !== null);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api
      .get<User>('/auth/me')
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/signup', { name, email, password });
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    // Drop everything session-scoped: any in-flight OAuth flow and the
    // persisted mock-backend state (balances, profile, transactions).
    clearPendingOAuth();
    clearPersistedState();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: user !== null,
      login,
      signup,
      logout,
    }),
    [user, initializing, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
