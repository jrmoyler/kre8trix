import { createContext, useContext } from 'react';

/** C7: dark/light theming. Kept separate from theme.tsx so the provider
 *  file only exports a component (react-refresh lint rule). */

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextValue {
  /** The user's stored preference ('system' follows the OS). */
  theme: ThemePreference;
  /** The theme actually applied to the document right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
