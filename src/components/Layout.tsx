import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Search,
  Bell,
  LayoutDashboard,
  Wallet,
  Target,
  TrendingUp,
  Zap,
  CreditCard,
  BarChart3,
  Settings,
  CheckCheck,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Navbar from './Navbar';
import Footer from './Footer';

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

const searchPages = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Wallet', path: '/wallet', icon: Wallet },
  { label: 'Credit Score', path: '/credit-score', icon: Target },
  { label: 'Cash Flow', path: '/cash-flow', icon: TrendingUp },
  { label: 'Advances', path: '/advances', icon: Zap },
  { label: 'Cards', path: '/cards', icon: CreditCard },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

interface AppNotification {
  id: number;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

const initialNotifications: AppNotification[] = [
  { id: 1, title: 'Payout received', detail: 'YouTube Ad Revenue — $4,850.00 deposited', time: '2h ago', read: false },
  { id: 2, title: 'CCS score updated', detail: 'Your Creator Credit Score rose to 612', time: '1d ago', read: false },
  { id: 3, title: 'Advance payment due', detail: 'KRA-2847 — next repayment on Oct 20', time: '2d ago', read: true },
];

function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages..." className="font-body" />
      <CommandList>
        <CommandEmpty className="py-6 text-center font-body text-[14px] text-[rgba(255,255,255,0.42)]">
          No results found.
        </CommandEmpty>
        <CommandGroup heading="Pages">
          {searchPages.map((page) => (
            <CommandItem
              key={page.path}
              value={page.label}
              onSelect={() => {
                onOpenChange(false);
                navigate(page.path);
              }}
              className="cursor-pointer font-body text-[14px] gap-3"
            >
              <page.icon size={16} className="text-[rgba(255,255,255,0.42)]" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-negative rounded-full" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 bg-panel border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
          <span className="font-display text-[18px] tracking-[0.02em] text-white">Notifications</span>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-electric hover:text-acid disabled:text-[rgba(255,255,255,0.2)] transition-colors"
          >
            <CheckCheck size={12} />
            Mark all read
          </button>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-panel2 transition-colors border-b border-[rgba(255,255,255,0.04)] last:border-b-0"
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  n.read ? 'bg-[rgba(255,255,255,0.12)]' : 'bg-acid'
                }`}
              />
              <span className="flex-1 min-w-0">
                <span className={`block font-body text-[14px] ${n.read ? 'text-[rgba(255,255,255,0.6)]' : 'text-white font-medium'}`}>
                  {n.title}
                </span>
                <span className="block font-mono text-[12px] text-[rgba(255,255,255,0.42)] truncate">
                  {n.detail}
                </span>
              </span>
              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.28)] flex-shrink-0">
                {n.time}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const isOnboarding = location.pathname === '/onboarding';
  const pageTitle = pageTitles[location.pathname] || 'Kre8trix';

  /* Cmd/Ctrl+K opens search */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  /* Onboarding is a full-screen flow — no chrome */
  if (isOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-void">
        <div className="noise-overlay" />
        {children}
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-void">
      {/* Noise overlay */}
      <div className="noise-overlay" />

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
              onClick={() => setSearchOpen(true)}
              aria-label="Search (Cmd+K)"
              title="Search (⌘K)"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
            >
              <Search size={20} />
            </button>
            <NotificationBell />
            <button
              onClick={() => navigate('/settings')}
              aria-label="Account settings"
              className="rounded-full"
            >
              <img
                src="/avatar-creator-1.png"
                alt="User"
                className="w-9 h-9 rounded-full object-cover border border-[rgba(255,255,255,0.1)] cursor-pointer hover:border-[rgba(255,255,255,0.3)] transition-colors"
              />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-[1400px] mx-auto p-8">
          {children}
        </main>

        <Footer />
      </div>

      {/* Command palette search */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Global toasts */}
      <Toaster />
    </div>
  );
}
