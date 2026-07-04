import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2, RotateCcw, TrendingUp, ChevronUp } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { CcsScore, CcsSimulationResult } from '@/lib/types';
import { ErrorNotice, ScoreCardSkeleton, SkeletonBlock } from '@/components/Skeletons';

/* ── constants ────────────────────────────────────────────── */
const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const TIERS = [
  { name: 'Emerging', range: '300-499', color: 'rgb(var(--color-violet))', benefits: ['Basic wallet', 'Standard advances up to $1K'] },
  { name: 'Rising', range: '500-649', color: 'rgb(var(--color-electric))', benefits: ['Priority payouts', 'Advances up to $5K', '1% cashback'] },
  { name: 'Stable', range: '650-749', color: 'rgb(var(--color-acid))', benefits: ['Instant advances up to $15K', '2% cashback', 'Lower fees'] },
  { name: 'Prime', range: '750-850', color: 'rgb(var(--color-gold))', benefits: ['Unlimited advances', '3% cashback', 'White-glove support'] },
];

/* ── animated counter hook ────────────────────────────────── */
function useAnimatedValue(target: number, duration: number, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const startTime = performance.now() + delay;
    const tick = (now: number) => {
      if (now < startTime) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — HERO SCORE RING                               */
/* ═══════════════════════════════════════════════════════════ */
function HeroScoreRing({ score }: { score: CcsScore }) {
  const animatedScore = useAnimatedValue(score.score, 1800, 200);
  const progress = score.score / score.maxScore;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(var(--acid-rgb),0.03) 0%, transparent 70%)',
      }}
    >
      <div className="flex flex-col items-center justify-center py-12 md:py-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(var(--fg-rgb),0.42)] mb-8"
        >
          YOUR CREATOR CREDIT SCORE
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="relative"
          style={{ filter: 'drop-shadow(0 0 40px rgba(var(--acid-rgb),0.2))' }}
        >
          <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(var(--color-acid))" />
                <stop offset="100%" stopColor="rgb(var(--color-electric))" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="160" r={RADIUS} stroke="rgba(var(--fg-rgb),0.06)" strokeWidth="16" fill="none" />
            <motion.circle
              cx="160" cy="160" r={RADIUS}
              stroke="url(#scoreGradient)"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.8, ease: easeOutExpo, delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[80px] md:text-[120px] font-medium text-ink leading-none tracking-[-0.02em]">
              {animatedScore}
            </span>
            <div className="w-10 h-px bg-[rgba(var(--fg-rgb),0.1)] my-2" />
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
              out of {score.maxScore}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: easeOutExpo, delay: 2.0 }}
          className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(var(--electric-rgb),0.15)' }}
        >
          <ChevronUp size={16} style={{ color: 'rgb(var(--color-electric))' }} />
          <span className="font-mono text-[12px] font-medium tracking-[0.04em]" style={{ color: 'rgb(var(--color-electric))' }}>
            {score.tier.toUpperCase()} CREATOR
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-3 font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)]"
        >
          Top {score.percentile}% of creators on Kre8trix
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-2 flex items-center gap-1 text-[rgb(var(--color-positive))]"
        >
          <TrendingUp size={14} />
          <span className="font-body text-[14px] font-medium">+{score.quarterDelta} points this quarter</span>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — SIGNAL BREAKDOWN                              */
/* ═══════════════════════════════════════════════════════════ */
function SignalBreakdown({ score }: { score: CcsScore }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <h3 className="font-display text-[36px] tracking-[0.02em] text-ink mb-1">Signal Breakdown</h3>
      <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em] mb-6">
        Seven weighted signals drive your CCS
      </p>
      <div className="space-y-5">
        {score.signals.map((signal, i) => (
          <div key={signal.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: signal.color }} />
                <span className="font-body text-[14px] text-ink">{signal.name}</span>
                <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)]">{signal.weight}%</span>
              </div>
              <span className="font-mono text-[14px] text-ink">{signal.score}</span>
            </div>
            <div className="h-2 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${((signal.score - 300) / 550) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: easeOutExpo, delay: i * 0.06 }}
                className="h-full rounded-full"
                style={{ background: signal.color, opacity: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 3 — SCORE HISTORY                                 */
/* ═══════════════════════════════════════════════════════════ */
function ScoreHistory({ score }: { score: CcsScore }) {
  const min = Math.min(...score.history.map((h) => h.score)) - 20;
  const max = Math.max(...score.history.map((h) => h.score)) + 20;
  const range = max - min;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <h3 className="font-display text-[36px] tracking-[0.02em] text-ink mb-6">Score History</h3>
      <div className="flex items-end justify-between gap-3 h-[180px]">
        {score.history.map((point, i) => (
          <div key={point.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <span className="font-mono text-[12px] text-ink">{point.score}</span>
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${((point.score - min) / range) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOutExpo, delay: i * 0.07 }}
              className="w-full max-w-[48px] rounded-t-lg"
              style={{
                background:
                  i === score.history.length - 1
                    ? 'linear-gradient(180deg, rgb(var(--color-acid)), rgba(var(--acid-rgb),0.2))'
                    : 'rgba(var(--electric-rgb),0.25)',
              }}
            />
            <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)]">{point.month}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 4 — WHAT-IF SIMULATOR                             */
/* ═══════════════════════════════════════════════════════════ */
function WhatIfSimulator({ score }: { score: CcsScore }) {
  const baseline = useMemo(
    () => Object.fromEntries(score.signals.map((s) => [s.name, s.score])),
    [score],
  );
  const [adjustments, setAdjustments] = useState<Record<string, number>>(baseline);
  const [result, setResult] = useState<CcsSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = score.signals.some((s) => adjustments[s.name] !== s.score);

  useEffect(() => {
    // When adjustments return to baseline, stale results are simply ignored
    // in render (see `projected` below) — no state reset needed.
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSimulating(true);
      setError(null);
      try {
        const changed: Record<string, number> = {};
        for (const s of score.signals) {
          if (adjustments[s.name] !== s.score) changed[s.name] = adjustments[s.name];
        }
        const simulation = await api.post<CcsSimulationResult>('/ccs/simulate', {
          adjustments: changed,
        });
        setResult(simulation);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Simulation failed');
      } finally {
        setSimulating(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [adjustments, dirty, score.signals]);

  const reset = () => {
    setAdjustments(baseline);
    setResult(null);
    setError(null);
  };

  const projected = dirty && result ? result.projectedScore : score.score;
  const delta = dirty && result ? result.delta : 0;
  const visibleError = dirty ? error : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="rounded-2xl p-6 border border-[rgba(var(--electric-rgb),0.15)]"
      style={{ background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--electric-rgb),0.04) 100%)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgba(var(--electric-rgb),0.15)] flex items-center justify-center">
            <FlaskConical size={20} className="text-electric" />
          </div>
          <div>
            <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">What-If Simulator</h3>
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
              Drag signals to see how your score would respond
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {dirty && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)] hover:text-ink transition-colors"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {simulating && <Loader2 size={16} className="animate-spin text-electric" />}
              <span className="font-mono text-[36px] font-medium text-ink tracking-[-0.02em] leading-none">
                {projected}
              </span>
            </div>
            <span
              className="font-mono text-[12px] tracking-[0.04em]"
              style={{ color: delta > 0 ? 'rgb(var(--color-positive))' : delta < 0 ? 'rgb(var(--color-negative))' : 'rgba(var(--fg-rgb),0.42)' }}
            >
              {delta > 0 ? `+${delta}` : delta} pts · {(dirty && result?.projectedTier) || score.tier}
            </span>
          </div>
        </div>
      </div>

      {visibleError && <p className="font-body text-[13px] text-negative mb-4">{visibleError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {score.signals.map((signal) => (
          <div key={signal.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-body text-[13px] text-ink">{signal.name}</span>
              <span className="font-mono text-[13px]" style={{ color: signal.color }}>
                {adjustments[signal.name]}
                {adjustments[signal.name] !== signal.score && (
                  <span className="text-[rgba(var(--fg-rgb),0.42)]"> (was {signal.score})</span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={300}
              max={850}
              step={5}
              value={adjustments[signal.name]}
              onChange={(e) =>
                setAdjustments((prev) => ({ ...prev, [signal.name]: Number(e.target.value) }))
              }
              className="w-full accent-acid cursor-pointer"
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 5 — TIERS                                         */
/* ═══════════════════════════════════════════════════════════ */
function TierLadder({ currentTier }: { currentTier: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <h3 className="font-display text-[36px] tracking-[0.02em] text-ink mb-6">Creator Tiers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.name === currentTier;
          return (
            <div
              key={tier.name}
              className={`rounded-2xl p-5 border transition-all ${
                isCurrent ? 'bg-panel' : 'bg-panel2 border-[rgba(var(--fg-rgb),0.08)]'
              }`}
              style={isCurrent ? { borderColor: `color-mix(in srgb, ${tier.color} 31%, transparent)` } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-[16px] font-semibold" style={{ color: tier.color }}>
                  {tier.name}
                </span>
                {isCurrent && (
                  <span
                    className="font-mono text-[10px] tracking-[0.08em] px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${tier.color} 13%, transparent)`, color: tier.color }}
                  >
                    CURRENT
                  </span>
                )}
              </div>
              <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] mb-3">{tier.range}</p>
              <ul className="space-y-1.5">
                {tier.benefits.map((benefit) => (
                  <li key={benefit} className="font-body text-[13px] text-[rgba(var(--fg-rgb),0.7)]">
                    · {benefit}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

export default function CreditScore() {
  const { data: score, loading, error, refresh } = useApi<CcsScore>('/ccs/score');

  if (error) {
    return (
      <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl">
        <ErrorNotice message={error} onRetry={refresh} />
      </div>
    );
  }

  if (loading || !score) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center py-12">
          <ScoreCardSkeleton />
        </div>
        <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroScoreRing score={score} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SignalBreakdown score={score} />
        <ScoreHistory score={score} />
      </div>
      <WhatIfSimulator score={score} />
      <TierLadder currentTier={score.tier} />
    </div>
  );
}
