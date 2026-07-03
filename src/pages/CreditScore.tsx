import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  Info,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { fetchCCSScore, fetchCCSSignals, simulateCCS } from '@/lib/api/ccs';
import type { CCSScoreSummary, CCSSimulationResult } from '@/lib/api/ccs';
import type { CCSSignal, CCSTierName } from '@/lib/api/types';

/* ── constants ────────────────────────────────────────────── */
const MIN_SCORE = 300;
const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIER_BADGE: Record<CCSTierName, { color: string; bg: string }> = {
  Emerging: { color: '#9B5DE5', bg: 'rgba(155,93,229,0.15)' },
  Rising: { color: '#00D4FF', bg: 'rgba(0,212,255,0.15)' },
  Stable: { color: '#C8FF00', bg: 'rgba(200,255,0,0.15)' },
  Prime: { color: '#FFD400', bg: 'rgba(255,212,0,0.15)' },
};

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

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — HERO SCORE RING                               */
/* ═══════════════════════════════════════════════════════════ */
function HeroScoreRing({ summary }: { summary: CCSScoreSummary }) {
  const animatedScore = useAnimatedValue(summary.score, 1800, 200);
  const progress = summary.score / summary.maxScore;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const badge = TIER_BADGE[summary.tier];
  const trendUp = summary.trend.delta >= 0;

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(200,255,0,0.03) 0%, transparent 70%)',
      }}
    >
      <div className="flex flex-col items-center justify-center py-12 md:py-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)] mb-8"
        >
          YOUR CREATOR CREDIT SCORE
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="relative"
          style={{ filter: 'drop-shadow(0 0 40px rgba(200,255,0,0.2))' }}
        >
          <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8FF00" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="160" r={RADIUS} stroke="rgba(255,255,255,0.06)" strokeWidth="16" fill="none" />
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
            <span className="font-mono text-[80px] md:text-[120px] font-medium text-white leading-none tracking-[-0.02em]">
              {animatedScore}
            </span>
            <div className="w-10 h-px bg-[rgba(255,255,255,0.1)] my-2" />
            <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
              out of {summary.maxScore}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: easeOutExpo, delay: 2.0 }}
          className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: badge.bg }}
        >
          <ChevronUp size={16} style={{ color: badge.color }} />
          <span className="font-mono text-[12px] font-medium tracking-[0.04em] uppercase" style={{ color: badge.color }}>
            {summary.tier} CREATOR
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-3 font-body text-[14px] text-[rgba(255,255,255,0.42)]"
        >
          {summary.percentile}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.3 }}
          className="mt-2 flex items-center gap-1"
          style={{ color: trendUp ? '#00E5A0' : '#FF4D4D' }}
        >
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="font-body text-[14px] font-medium">
            {trendUp ? '+' : ''}{summary.trend.delta} points {summary.trend.period}
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — SIGNAL RADAR + BREAKDOWN BARS                 */
/* ═══════════════════════════════════════════════════════════ */
function SignalBreakdown({ signals, maxScore }: { signals: CCSSignal[]; maxScore: number }) {
  const radarData = signals.map((s) => ({ signal: s.name.split(' ')[0], score: s.score }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      <div className="bg-panel border border-[rgba(255,255,255,0.06)] rounded-2xl p-6">
        <p className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)] mb-4">
          SIGNAL RADAR
        </p>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="signal"
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}
              />
              <PolarRadiusAxis domain={[MIN_SCORE, maxScore]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#C8FF00" strokeWidth={2} fill="#C8FF00" fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-panel border border-[rgba(255,255,255,0.06)] rounded-2xl p-6">
        <p className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)] mb-5">
          SIGNAL BREAKDOWN
        </p>
        <div className="space-y-5">
          {signals.map((signal) => (
            <div key={signal.name}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-body text-[13px] text-[rgba(255,255,255,0.7)]">{signal.name}</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.42)]">{signal.weight}%</span>
                  <span className="font-mono text-[13px] text-white">{signal.score}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((signal.score - MIN_SCORE) / (maxScore - MIN_SCORE)) * 100}%` }}
                  transition={{ duration: 0.8, ease: easeOutExpo }}
                  className="h-full rounded-full"
                  style={{ background: signal.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 3 — WHAT-IF SIMULATOR                             */
/* ═══════════════════════════════════════════════════════════ */
function WhatIfSimulator({
  signals,
  baseScore,
  maxScore,
}: {
  signals: CCSSignal[];
  baseScore: number;
  maxScore: number;
}) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(signals.map((s) => [s.name, s.score])),
  );
  const [result, setResult] = useState<CCSSimulationResult>({ projectedScore: baseScore, delta: 0 });
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simKey, setSimKey] = useState(0);
  const requestId = useRef(0);
  const mounted = useRef(false);

  const dirty = signals.some((s) => values[s.name] !== s.score);

  /* Debounced ~300ms: slider changes coalesce into one POST /ccs/simulate. */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      setSimulating(true);
      setSimError(null);
      simulateCCS(values)
        .then((res) => {
          if (requestId.current === id) setResult(res);
        })
        .catch((err: unknown) => {
          if (requestId.current === id) {
            setSimError(err instanceof Error ? err.message : 'Simulation failed. Please try again.');
          }
        })
        .finally(() => {
          if (requestId.current === id) setSimulating(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [values, simKey]);

  const deltaUp = result.delta >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.1 }}
      className="bg-panel border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[12px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)]">
            WHAT-IF SIMULATOR
          </p>
          <p className="font-body text-[13px] text-[rgba(255,255,255,0.42)] mt-1">
            Drag a signal to see how it would move your score.
          </p>
        </div>
        <button
          onClick={() => setValues(Object.fromEntries(signals.map((s) => [s.name, s.score])))}
          disabled={!dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] font-mono text-[11px] tracking-[0.04em] uppercase text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.25)] transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-8">
        <div className="space-y-5">
          {signals.map((signal) => (
            <div key={signal.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body text-[13px] text-[rgba(255,255,255,0.7)]">{signal.name}</span>
                <span className="font-mono text-[13px]" style={{ color: signal.color }}>
                  {values[signal.name]}
                </span>
              </div>
              <input
                type="range"
                min={MIN_SCORE}
                max={maxScore}
                step={5}
                value={values[signal.name]}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setValues((prev) => ({ ...prev, [signal.name]: next }));
                }}
                aria-label={`${signal.name} what-if value`}
                className="w-full h-1.5 cursor-pointer"
                style={{ accentColor: signal.color }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[rgba(255,255,255,0.42)] mb-3">
            PROJECTED SCORE
          </p>
          {simError ? (
            <>
              <p className="font-body text-[13px] text-[rgba(255,255,255,0.42)]">{simError}</p>
              <button
                onClick={() => setSimKey((k) => k + 1)}
                className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-acid text-black font-body text-[13px] font-semibold hover:opacity-90 transition-opacity duration-200"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </>
          ) : (
            <>
              <span
                className={`font-mono text-[56px] font-medium text-white leading-none tracking-[-0.02em] transition-opacity duration-200 ${simulating ? 'opacity-40' : ''}`}
              >
                {result.projectedScore}
              </span>
              <div
                className="mt-3 flex items-center gap-1 px-3 py-1 rounded-full"
                style={{
                  color: deltaUp ? '#00E5A0' : '#FF4D4D',
                  background: deltaUp ? 'rgba(0,229,160,0.12)' : 'rgba(255,77,77,0.12)',
                }}
              >
                {deltaUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span className="font-mono text-[12px] font-medium">
                  {deltaUp ? '+' : ''}{result.delta} pts
                </span>
              </div>
              <p className="mt-3 font-body text-[12px] text-[rgba(255,255,255,0.42)]">
                vs. your current {baseScore}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ─────────────────────────── loading / error ─────────────────────────── */

function CreditScoreSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="animate-pulse bg-surface rounded-2xl h-[520px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse bg-surface rounded-2xl h-[380px]" />
        <div className="animate-pulse bg-surface rounded-2xl h-[380px]" />
      </div>
      <div className="animate-pulse bg-surface rounded-2xl h-[420px]" />
    </div>
  );
}

function CreditScoreError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-panel border border-[rgba(255,77,0,0.25)] rounded-2xl p-12 flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,77,0,0.12)' }}>
        <Info size={22} className="text-ember" />
      </div>
      <div>
        <p className="font-display text-[28px] tracking-[0.02em] text-white">
          Couldn't load your credit score
        </p>
        <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2.5 rounded-xl bg-acid text-black font-body text-[14px] font-semibold hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
      >
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  );
}

/* ─────────────────────────── main page ─────────────────────────── */

export default function CreditScore() {
  const [summary, setSummary] = useState<CCSScoreSummary | null>(null);
  const [signals, setSignals] = useState<CCSSignal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCCSScore(), fetchCCSSignals()])
      .then(([scoreRes, signalsRes]) => {
        if (cancelled) return;
        setSummary(scoreRes);
        setSignals(signalsRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  if (loadError) {
    return (
      <CreditScoreError
        message={loadError}
        onRetry={() => {
          setLoadError(null);
          setLoadKey((k) => k + 1);
        }}
      />
    );
  }

  if (!summary || !signals) {
    return <CreditScoreSkeleton />;
  }

  return (
    <div className="space-y-8">
      <HeroScoreRing summary={summary} />
      <SignalBreakdown signals={signals} maxScore={summary.maxScore} />
      <WhatIfSimulator signals={signals} baseScore={summary.score} maxScore={summary.maxScore} />
    </div>
  );
}
