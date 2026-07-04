import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from './theme-context';

/** C7: ThemeProvider — persists preference, applies data-theme on <html>,
 *  and tracks prefers-color-scheme while in 'system' mode. */

const STORAGE_KEY = 'kre8trix.theme';

function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'dark' || value === 'light' || value === 'system') return value;
  } catch {
    /* storage unavailable — fall through to default */
  }
  return 'dark';
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  /* Apply the resolved theme to <html data-theme="..."> */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  /* Follow OS preference while in 'system' mode */
  useEffect(() => {
    if (theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => setSystemTheme(query.matches ? 'light' : 'dark');
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — preference lives for this session only */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
