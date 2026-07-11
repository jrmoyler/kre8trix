import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(var(--fg-rgb),0.08)] bg-deep px-6 py-4 mt-auto">
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] text-acid tracking-[0.02em]">KRE8TRIX</span>
          <span className="text-[rgba(var(--fg-rgb),0.3)]">|</span>
          <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.6)] tracking-[0.04em]">
            Confidential &amp; Proprietary
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* D2/D3: internal-ops Compliance Console — intentionally not in the primary nav */}
          <Link
            to="/compliance/aml"
            className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.6)] tracking-[0.04em] hover:text-ink transition-colors"
          >
            Compliance Console
          </Link>
          <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.6)] tracking-[0.04em]">
            Internal Document &middot; 2026
          </span>
        </div>
      </div>
    </footer>
  );
}
