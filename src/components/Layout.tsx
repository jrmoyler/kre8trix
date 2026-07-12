import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Moon, Search, Settings, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import Navbar from './Navbar';
import Footer from './Footer';
import InitialsAvatar from './InitialsAvatar';
import CommandPalette from './CommandPalette';
import { useCommandPaletteShortcut } from '@/hooks/use-command-palette-shortcut';
import NotificationBell from './NotificationBell';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallet': 'Wallet',
  '/credit-score': 'Credit Score',
  '/cash-flow': 'Cash Flow',
  '/taxes': 'Tax Center',
  '/advances': 'Advances',
  '/marketplace': 'Marketplace',
  '/cards': 'Cards',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/compliance/aml': 'Compliance · Transaction Monitoring',
  '/compliance/audit-log': 'Compliance · Audit Log',
  '/notifications-center': 'Notifications',
};

function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full hover:brightness-110 transition-all"
      >
        <InitialsAvatar name={user?.name ?? 'K'} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[220px] bg-panel border border-[rgba(var(--fg-rgb),0.1)] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-[70]"
          >
            <div className="px-4 py-3 border-b border-[rgba(var(--fg-rgb),0.08)]">
              <p className="font-body text-[14px] text-ink font-medium truncate">
                {user?.name ?? 'Creator'}
              </p>
              <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] truncate">
                {user?.email}
              </p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-body text-[13px] text-[rgb(var(--color-ink))] hover:bg-[rgba(var(--fg-rgb),0.06)] transition-colors"
              >
                <Settings size={15} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-body text-[13px] text-negative hover:bg-[rgba(var(--negative-rgb),0.08)] transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* C7: quick dark/light switch in the top bar (full control lives in Settings > Display) */
function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] transition-all duration-200"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  /* D1: the KYC wizard is full-screen like Onboarding — no sidebar/top bar chrome. */
  const isOnboarding = location.pathname === '/onboarding' || location.pathname === '/kyc';
  const pageTitle = pageTitles[location.pathname] || 'Kre8trix';

  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);
  useCommandPaletteShortcut(togglePalette);

  /* Onboarding is a full-screen flow — no chrome */
  if (isOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-void">
        <div className="noise-overlay" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-void">
      {/* D4: skip link — hidden until focused, lets keyboard users bypass the sidebar/top bar */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-acid focus:text-void focus:px-4 focus:py-2 focus:rounded-xl focus:font-body focus:text-[14px] focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Toasts */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--color-panel))',
            border: '1px solid rgba(var(--fg-rgb),0.1)',
            color: 'rgb(var(--color-ink))',
            borderRadius: '14px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
          },
        }}
      />

      {/* Cmd+K palette (mounted only while open so its state resets) */}
      {paletteOpen && <CommandPalette onOpenChange={setPaletteOpen} />}

      {/* Sidebar */}
      <Navbar />

      {/* Main content area */}
      <div className="md:ml-[72px] lg:ml-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 bg-void/80 backdrop-blur-[20px] border-b border-[rgba(var(--fg-rgb),0.08)] flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[28px] tracking-[0.02em] text-ink">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search (Cmd+K)"
              aria-haspopup="dialog"
              aria-expanded={paletteOpen}
              className="group flex items-center gap-3 h-10 px-3 rounded-xl text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] transition-all duration-200"
            >
              <Search size={20} />
              <kbd className="hidden md:inline-flex font-mono text-[10px] tracking-[0.04em] bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] rounded-md px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
            <ThemeToggleButton />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="max-w-[1400px] mx-auto p-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
