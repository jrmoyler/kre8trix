/**
 * Auth context for Kre8trix.
 *
 * `AuthProvider` owns the signed-in user and exposes login/signup/logout
 * actions backed by the auth API module (src/lib/api/auth.ts). On mount it
 * restores the session from the stored token via GET /auth/me, so a page
 * reload keeps the user signed in. Consume with `useAuth()`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuthToken, type User } from '@/lib/api/index';
import {
  clearAuthToken,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  storeAuthToken,
} from '@/lib/api/auth';

interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: User | null;
  /** True while the session is being restored on initial mount. */
  loading: boolean;
  /** Signs in; resolves with the user or rejects with ApiError. */
  login: (email: string, password: string) => Promise<User>;
  /** Creates an account; resolves with the user or rejects with ApiError. */
  signup: (email: string, password: string, name?: string) => Promise<User>;
  /** Ends the session and clears the stored token. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* Restore session from the stored token on mount */
  useEffect(() => {
    let cancelled = false;

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: signedIn } = await apiLogin({ email, password });
    storeAuthToken(token);
    setUser(signedIn);
    return signedIn;
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const { token, user: signedIn } = await apiSignup({ email, password, name });
    storeAuthToken(token);
    setUser(signedIn);
    return signedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* signing out locally regardless */
    }
    clearAuthToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Accesses the auth session. Must be used inside `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
