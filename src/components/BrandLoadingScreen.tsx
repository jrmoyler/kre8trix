/*
 * D5 — shared brand-consistent loading treatment, extracted from
 * ProtectedRoute so the same visual is reused as the Suspense fallback
 * for lazy-loaded routes instead of introducing a second loading UI.
 */
export default function BrandLoadingScreen({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-[100dvh] bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="font-display text-[28px] tracking-[0.02em] text-acid animate-pulse">
          KRE8TRIX
        </span>
        <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
          {label}
        </span>
      </div>
    </div>
  );
}
