import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

/**
 * D2/D3 — small internal nav shared by the Compliance Console pages.
 * Deliberately not part of the primary Navbar/CommandPalette surface —
 * this is framed as an internal ops view, reachable via the footer link.
 */
export default function ComplianceNav({ active }: { active: 'aml' | 'audit-log' }) {
  const tabs = [
    { key: 'aml' as const, label: 'AML Monitoring', path: '/compliance/aml' },
    { key: 'audit-log' as const, label: 'Audit Log', path: '/compliance/audit-log' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[rgba(var(--violet-rgb),0.08)] border border-[rgba(var(--violet-rgb),0.2)]">
        <ShieldAlert size={16} className="text-violet flex-shrink-0" />
        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.6)]">
          Internal compliance ops view — mock data, not part of the creator-facing product.
        </p>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={`px-4 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${
              active === tab.key ? 'bg-acid text-void' : 'text-[rgba(var(--fg-rgb),0.42)] hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
