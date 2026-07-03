/* App-styled loading skeletons used while API data is in flight. */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[rgba(255,255,255,0.06)] ${className}`} />;
}

export function BalanceCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 bg-panel border border-[rgba(255,255,255,0.08)]">
      <SkeletonBlock className="h-3 w-24 mb-4" />
      <SkeletonBlock className="h-9 w-44 mb-3" />
      <SkeletonBlock className="h-5 w-32" />
    </div>
  );
}

export function ScoreCardSkeleton() {
  return (
    <div className="rounded-2xl p-8 bg-panel border border-[rgba(255,255,255,0.08)] flex flex-col items-center">
      <SkeletonBlock className="h-6 w-48 mb-8 self-start" />
      <div className="animate-pulse rounded-full bg-[rgba(255,255,255,0.06)] w-[200px] h-[200px] mb-6" />
      <SkeletonBlock className="h-6 w-24 mb-2" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  );
}

export function ChartSkeleton({ height = 350 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-[rgba(255,255,255,0.04)] flex items-end justify-around gap-2 p-6"
      style={{ height }}
    >
      {[45, 65, 40, 75, 55, 85, 60, 95].map((h, i) => (
        <div
          key={i}
          className="w-full rounded-t-lg bg-[rgba(255,255,255,0.05)]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function TransactionListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-4">
          <div className="animate-pulse w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-40" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <SkeletonBlock className="h-3.5 w-20" />
            <SkeletonBlock className="h-2.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="h-3 w-[70px] flex-shrink-0" />
          <SkeletonBlock className="h-8 flex-1" />
          <SkeletonBlock className="h-3 w-[70px] flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <p className="font-body text-[14px] text-negative">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-mono text-[12px] tracking-[0.04em] text-electric hover:text-acid transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
