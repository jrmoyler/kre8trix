import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Search, Settings } from 'lucide-react';
import { Toaster } from 'sonner';
import Navbar from './Navbar';
import Footer from './Footer';
import CommandPalette from './CommandPalette';
import { useCommandPaletteShortcut } from '@/hooks/use-command-palette-shortcut';
import NotificationBell from './NotificationBell';
import { useAuth } from '@/lib/auth-context';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallet': 'Wallet',
  '/credit-score': 'Credit Score',
  '/cash-flow': 'Cash Flow',
  '/advances': 'Advances',
  '/cards': 'Cards',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Account menu">
        <img
          src="/avatar-creator-1.png"
          alt="User"
          className="w-9 h-9 rounded-full object-cover border border-[rgba(255,255,255,0.1)] cursor-pointer hover:border-[rgba(255,255,255,0.3)] transition-colors"
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[220px] bg-panel border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-[70]"
          >
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
              <p className="font-body text-[14px] text-white font-medium truncate">
                {user?.name ?? 'Creator'}
              </p>
              <p className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] truncate">
                {user?.email}
              </p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-body text-[13px] text-[#E8E8F0] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <Settings size={15} className="text-[rgba(255,255,255,0.42)]" />
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-body text-[13px] text-negative hover:bg-[rgba(255,77,77,0.08)] transition-colors"
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

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isOnboarding = location.pathname === '/onboarding';
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
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Toasts */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F0F1E',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#E8E8F0',
            borderRadius: '14px',
            fontFamily: '"Bricolage Grotesque", sans-serif',
          },
        }}
      />

      {/* Cmd+K palette (mounted only while open so its state resets) */}
      {paletteOpen && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />}

      {/* Sidebar */}
      <Navbar />

      {/* Main content area */}
      <div className="md:ml-[72px] lg:ml-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 bg-void/80 backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[28px] tracking-[0.02em] text-white">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search (Cmd+K)"
              className="group flex items-center gap-3 h-10 px-3 rounded-xl text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
            >
              <Search size={20} />
              <kbd className="hidden md:inline-flex font-mono text-[10px] tracking-[0.04em] bg-panel2 border border-[rgba(255,255,255,0.08)] rounded-md px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-[1400px] mx-auto p-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
