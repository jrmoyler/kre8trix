import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Wallet,
  Target,
  TrendingUp,
  Zap,
  Store,
  CreditCard,
  BarChart3,
  Receipt,
  Settings,
} from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Credit Score', icon: Target, path: '/credit-score' },
  { label: 'Cash Flow', icon: TrendingUp, path: '/cash-flow' },
  { label: 'Tax Center', icon: Receipt, path: '/taxes' }, // C3: Tax Center

  { label: 'Advances', icon: Zap, path: '/advances' },
  { label: 'Marketplace', icon: Store, path: '/marketplace' }, // C2

  { label: 'Cards', icon: CreditCard, path: '/cards' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Mirrors the Tailwind md (>=768px) / lg (>=1024px) breakpoints used
      // for the content margin in Layout.tsx (md:ml-[72px] lg:ml-[260px]):
      // collapsed (72px) exactly across the md-but-not-lg range, expanded
      // (260px) at lg and up.
      if (window.innerWidth < 768) {
        setCollapsed(false);
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      {/* ── Desktop / tablet sidebar (>= md) ───────────────────────────── */}
      <aside
        className={`
          hidden md:flex fixed top-0 left-0 h-full bg-deep border-r border-[rgba(var(--fg-rgb),0.08)]
          flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          z-[56]
          ${sidebarWidth}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="font-display text-[24px] tracking-[0.02em] text-acid hover:brightness-110 transition-all"
          >
            {collapsed ? 'K' : 'KRE8TRIX'}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 h-12 px-4 rounded-xl transition-all duration-200
                  ${active
                    ? 'text-acid bg-[rgba(var(--acid-rgb),0.08)] border-l-2 border-acid'
                    : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] border-l-2 border-transparent'
                  }
                  ${collapsed ? 'justify-center px-2' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="font-body text-[14px] font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: User */}
        <div
          className={`
            border-t border-[rgba(var(--fg-rgb),0.08)] p-4 flex items-center gap-3
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <InitialsAvatar name={user?.name ?? 'K'} size={40} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-ink font-medium truncate">{user?.name ?? 'Creator'}</p>
              <p className="text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] truncate">Creator</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (< md) ───────────────────────────────
          Replaces the old hamburger overlay, which sat over the page title.
          All ten tabs stay reachable via horizontal scroll. */}
      <nav
        aria-label="Primary"
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-[56]
          bg-deep border-t border-[rgba(var(--fg-rgb),0.08)]
          overflow-x-auto
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <ul className="flex items-stretch min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path} className="flex-1">
                <button
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    w-full min-w-[68px] h-16 px-2 flex flex-col items-center justify-center gap-1
                    transition-colors duration-200
                    ${active
                      ? 'text-acid'
                      : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'
                    }
                  `}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="font-body text-[10px] font-medium leading-none whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
