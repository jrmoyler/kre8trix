import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface PaletteItem {
  label: string;
  keywords: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/*
 * The palette is conditionally mounted by its parent (Layout), so the
 * query input state resets naturally between openings.
 */
export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const pages: PaletteItem[] = [
    { label: 'Dashboard', keywords: 'home overview', icon: LayoutDashboard, action: () => go('/dashboard') },
    { label: 'Wallet', keywords: 'balance money usdc', icon: Wallet, action: () => go('/wallet') },
    { label: 'Credit Score', keywords: 'ccs score signals', icon: Target, action: () => go('/credit-score') },
    { label: 'Cash Flow', keywords: 'forecast tax reserve', icon: TrendingUp, action: () => go('/cash-flow') },
    { label: 'Advances', keywords: 'financing loan capital', icon: Zap, action: () => go('/advances') },
    { label: 'Cards', keywords: 'card spend freeze', icon: CreditCard, action: () => go('/cards') },
    { label: 'Analytics', keywords: 'revenue platforms charts', icon: BarChart3, action: () => go('/analytics') },
    { label: 'Settings', keywords: 'profile notifications security', icon: Settings, action: () => go('/settings') },
  ];

  const actions: PaletteItem[] = [
    { label: 'Send Money', keywords: 'transfer pay wallet', icon: ArrowUpRight, action: () => go('/wallet?action=send') },
    { label: 'Request Payment', keywords: 'invoice receive wallet', icon: ArrowDownLeft, action: () => go('/wallet?action=request') },
    { label: 'Convert USD ↔ USDC', keywords: 'swap exchange crypto', icon: RefreshCw, action: () => go('/wallet?action=convert') },
    { label: 'Get an Advance', keywords: 'financing apply capital', icon: Zap, action: () => go('/advances') },
    { label: 'Restart Onboarding', keywords: 'setup connect platforms', icon: Rocket, action: () => go('/onboarding') },
    {
      label: 'Sign Out',
      keywords: 'logout exit',
      icon: LogOut,
      action: () => {
        onOpenChange(false);
        logout();
      },
    },
  ];

  const renderItem = (item: PaletteItem) => (
    <Command.Item
      key={item.label}
      value={`${item.label} ${item.keywords}`}
      onSelect={item.action}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer font-body text-[14px] text-[#E8E8F0] data-[selected=true]:bg-[rgba(200,255,0,0.08)] data-[selected=true]:text-white transition-colors"
    >
      <item.icon size={16} className="text-[rgba(255,255,255,0.42)]" />
      {item.label}
    </Command.Item>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <Command
        label="Search"
        className="relative w-full max-w-[560px] bg-panel border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 px-4 border-b border-[rgba(255,255,255,0.08)]">
          <Search size={18} className="text-[rgba(255,255,255,0.42)] flex-shrink-0" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages and actions…"
            className="flex-1 h-14 bg-transparent font-body text-[15px] text-white placeholder:text-[rgba(255,255,255,0.3)] outline-none"
          />
          <kbd className="font-mono text-[10px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] bg-panel2 border border-[rgba(255,255,255,0.08)] rounded-md px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[380px] overflow-y-auto p-2">
          <Command.Empty className="py-10 text-center font-body text-[14px] text-[rgba(255,255,255,0.42)]">
            No results for “{query}”
          </Command.Empty>

          <Command.Group
            heading="Quick Actions"
            className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[rgba(255,255,255,0.3)]"
          >
            {actions.map(renderItem)}
          </Command.Group>

          <Command.Group
            heading="Pages"
            className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[rgba(255,255,255,0.3)]"
          >
            {pages.map(renderItem)}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
