export default function Footer() {
  return (
    <footer className="border-t border-[rgba(var(--fg-rgb),0.08)] bg-deep px-6 py-4 mt-auto">
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] text-acid tracking-[0.02em]">KRE8TRIX</span>
          <span className="text-[rgba(var(--fg-rgb),0.2)]">|</span>
          <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
            Confidential &amp; Proprietary
          </span>
        </div>
        <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.2)] tracking-[0.04em]">
          Internal Document &middot; 2026
        </span>
      </div>
    </footer>
  );
}
