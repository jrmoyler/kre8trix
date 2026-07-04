import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Wallet,
  Target,
  TrendingUp,
  Zap,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Credit Score', icon: Target, path: '/credit-score' },
  { label: 'Cash Flow', icon: TrendingUp, path: '/cash-flow' },
  { label: 'Advances', icon: Zap, path: '/advances' },
  { label: 'Cards', icon: CreditCard, path: '/cards' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setCollapsed(false);
      } else if (window.innerWidth <= 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-[60] md:hidden bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-lg p-2 text-ink"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-deep border-r border-[rgba(var(--fg-rgb),0.08)]
          flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          z-[56]
          ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
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
                    : 'text-[rgba(var(--fg-rgb),0.42)] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)] border-l-2 border-transparent'
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
              <p className="text-[12px] text-[rgba(var(--fg-rgb),0.42)] truncate">Creator</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
