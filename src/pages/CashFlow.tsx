import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BrainCircuit, Landmark, Loader2, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type {
  CashFlowForecast,
  ForecastWindow,
  ReserveBuilder,
  SeasonalityMonth,
  TaxTracker,
} from '@/lib/types';
import { ChartSkeleton, ErrorNotice, SkeletonBlock } from '@/components/Skeletons';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];
const FORECAST_WINDOWS: ForecastWindow[] = ['30D', '60D', '90D'];

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — AI INSIGHT BANNER                             */
/* ═══════════════════════════════════════════════════════════ */
function AIInsightBanner() {
  const navigate = useNavigate();

  const chips = [
    {
      label: 'Apply for a $5K advance',
      style: 'bg-[rgba(var(--ember-rgb),0.15)] text-[rgb(var(--color-ember))]',
      action: () => navigate('/advances'),
    },
    {
      label: 'Defer equipment purchase',
      style: 'bg-panel2 text-ink',
      action: () => toast.success('Equipment purchase deferred — we moved the reminder to November'),
    },
    {
      label: 'Adjust tax withholding',
      style: 'bg-[rgba(var(--electric-rgb),0.15)] text-[rgb(var(--color-electric))]',
      action: () => {
        document.getElementById('tax-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="w-full rounded-[20px] p-7 border border-[rgba(var(--acid-rgb),0.1)]"
      style={{
        background: 'linear-gradient(135deg, rgba(var(--acid-rgb),0.04), rgba(var(--electric-rgb),0.04))',
      }}
    >
      <div className="flex gap-4">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-acid)), rgb(var(--color-electric)))' }}
        >
          <BrainCircuit size={24} className="text-void" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h5 className="font-body text-[20px] font-semibold text-acid">Kre8trix AI</h5>
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">Just now</span>
          </div>
          <div className="border-l-[3px] border-acid pl-4">
            <p className="font-body text-[18px] text-[rgb(var(--color-ink))] leading-relaxed">
              Your October looks tight. Q4 AdSense typically drops 23% for your category. Consider activating your equipment credit line.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.action}
                className={`px-4 py-2 rounded-full font-body text-[14px] font-medium transition-all hover:scale-105 ${chip.style}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — FORECAST CHART                                */
/* ═══════════════════════════════════════════════════════════ */
function ForecastChart() {
  const [timeWindow, setTimeWindow] = useState<ForecastWindow>('30D');
  const [showConfidence, setShowConfidence] = useState(true);
  const { data: forecast, loading, error, refresh } = useApi<CashFlowForecast>(
    `/cashflow/forecast?window=${timeWindow}`,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-[48px] tracking-[0.02em] text-ink">Income Forecast</h2>
          {forecast && (
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
              {forecast.confidencePercent}% model confidence over {timeWindow}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[rgba(var(--fg-rgb),0.06)] rounded-xl p-1">
            {FORECAST_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-4 py-2 rounded-lg font-mono text-[12px] font-medium transition-all ${w === timeWindow ? 'bg-acid text-void' : 'text-[rgba(var(--fg-rgb),0.42)] hover:text-ink'}`}
              >
                {w}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={(e) => setShowConfidence(e.target.checked)}
              className="w-4 h-4 accent-acid"
            />
            <span className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)]">Confidence bands</span>
          </label>
        </div>
      </div>

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !forecast ? (
        <ChartSkeleton height={400} />
      ) : (
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast.points}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-acid))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="rgb(var(--color-acid))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-electric))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="rgb(var(--color-electric))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-electric))" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="rgb(var(--color-electric))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(var(--fg-rgb),0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(var(--fg-rgb),0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--color-panel2))',
                  border: '1px solid rgba(var(--fg-rgb),0.08)',
                  borderRadius: '12px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  color: 'rgb(var(--color-ink))',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              {showConfidence && (
                <>
                  <Area type="monotone" dataKey="high" stroke="none" fill="url(#confidenceFill)" />
                  <Area type="monotone" dataKey="low" stroke="none" fill="rgb(var(--color-void))" />
                </>
              )}
              <Area type="monotone" dataKey="actual" stroke="rgb(var(--color-acid))" strokeWidth={2} fill="url(#actualFill)" connectNulls={false} dot={false} />
              <Area type="monotone" dataKey="projected" stroke="rgb(var(--color-electric))" strokeWidth={2} strokeDasharray="6 4" fill="url(#projectedFill)" connectNulls={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {forecast && (
        <div className="flex flex-wrap items-center gap-6 mt-4">
          {forecast.summary.map((pill) => (
            <button
              key={pill.window}
              onClick={() => setTimeWindow(pill.window)}
              className={`flex items-center gap-2 transition-opacity ${timeWindow === pill.window ? '' : 'opacity-50 hover:opacity-80'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: pill.color }} />
              <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
                {pill.label}:
              </span>
              <span className="font-mono text-[18px] font-medium text-ink tracking-[-0.02em]">
                ${pill.amount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 3 — SEASONALITY                                   */
/* ═══════════════════════════════════════════════════════════ */
function Seasonality() {
  const { data: months, loading, error, refresh } = useApi<SeasonalityMonth[]>('/cashflow/seasonality');

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <h3 className="font-display text-[36px] tracking-[0.02em] text-ink mb-1">Seasonality</h3>
      <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em] mb-6">
        Your income index by month (100 = your average)
      </p>
      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !months ? (
        <ChartSkeleton height={160} />
      ) : (
        <div className="flex items-end gap-2 h-[160px]">
          {months.map((m, i) => {
            const max = Math.max(...months.map((x) => x.index));
            const isPeak = m.index >= 115;
            const isTrough = m.index <= 85;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)]">{m.index}</span>
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(m.index / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: easeOutExpo, delay: i * 0.04 }}
                  className="w-full rounded-t-md"
                  style={{
                    background: isPeak
                      ? 'linear-gradient(180deg, rgb(var(--color-acid)), rgba(var(--acid-rgb),0.3))'
                      : isTrough
                      ? 'rgba(var(--negative-rgb),0.4)'
                      : 'rgba(var(--electric-rgb),0.3)',
                  }}
                />
                <span className="font-mono text-[10px] text-[rgba(var(--fg-rgb),0.42)]">{m.month}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 4 — TAX TRACKER                                   */
/* ═══════════════════════════════════════════════════════════ */
function TaxTrackerCard() {
  const { data: tax, loading, error, refresh } = useApi<TaxTracker>('/cashflow/tax');
  const taxCoveredPct = tax ? Math.min(100, Math.round((tax.setAside / tax.estimatedOwed) * 100)) : 0;

  return (
    <motion.section
      id="tax-tracker"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[rgba(var(--gold-rgb),0.15)] flex items-center justify-center">
          <Landmark size={20} style={{ color: 'rgb(var(--color-gold))' }} />
        </div>
        <div>
          <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Tax Tracker</h3>
          <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
            Estimated self-employment taxes
          </p>
        </div>
        <Link to="/taxes" className="ml-auto font-mono text-[12px] tracking-[0.04em] text-electric hover:text-acid transition-colors whitespace-nowrap">Open Tax Center →</Link>{/* C3: Tax Center */}
      </div>

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !tax ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-10 w-2/3" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'YTD Income', value: `$${tax.ytdIncome.toLocaleString()}` },
              { label: 'Est. Rate', value: `${tax.estimatedRatePercent}%` },
              { label: 'Est. Owed', value: `$${tax.estimatedOwed.toLocaleString()}` },
              { label: 'Set Aside', value: `$${tax.setAside.toLocaleString()}` },
            ].map((stat) => (
              <div key={stat.label} className="bg-panel2 rounded-xl p-4">
                <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em] mb-1">
                  {stat.label}
                </p>
                <p className="font-mono text-[18px] font-medium text-ink tracking-[-0.02em]">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
              {taxCoveredPct}% covered
            </span>
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
              Next deadline: {tax.nextDeadline}
            </span>
          </div>
          <div className="h-2.5 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${taxCoveredPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: easeOutExpo }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgb(var(--color-gold)), rgb(var(--color-acid)))' }}
            />
          </div>
        </>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 5 — RESERVE BUILDER                               */
/* ═══════════════════════════════════════════════════════════ */
function ReserveBuilderCard() {
  const { data: reserve, loading, error, refresh, setData } = useApi<ReserveBuilder>('/cashflow/reserve');
  const [saving, setSaving] = useState(false);
  const reserveGoalPct = reserve ? Math.min(100, Math.round((reserve.current / reserve.goal) * 100)) : 0;

  const updateReserve = async (patch: Partial<ReserveBuilder>) => {
    setSaving(true);
    try {
      const updated = await api.put<ReserveBuilder>('/cashflow/reserve', patch);
      setData(updated);
      toast.success('Reserve plan updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update reserve');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="rounded-2xl p-6 border border-[rgba(var(--positive-rgb),0.15)]"
      style={{ background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--positive-rgb),0.04) 100%)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgba(var(--positive-rgb),0.15)] flex items-center justify-center">
            <PiggyBank size={20} style={{ color: 'rgb(var(--color-positive))' }} />
          </div>
          <div>
            <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Reserve Builder</h3>
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
              Smooth out slow months with an income buffer
            </p>
          </div>
        </div>
        {saving && <Loader2 size={18} className="animate-spin text-positive" />}
      </div>

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !reserve ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-12 w-1/2" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
            <div>
              <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em] mb-1">
                Saved so far
              </p>
              <p className="font-mono text-[40px] font-medium text-ink tracking-[-0.02em] leading-none">
                ${reserve.current.toLocaleString()}
                <span className="text-[18px] text-[rgba(var(--fg-rgb),0.42)]"> / ${reserve.goal.toLocaleString()}</span>
              </p>
            </div>
            <span className="font-mono text-[13px] text-positive">
              {reserveGoalPct}% of goal
            </span>
          </div>

          <div className="h-2.5 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden mb-6">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${reserveGoalPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: easeOutExpo }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgb(var(--color-positive)), rgb(var(--color-acid)))' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reserve-monthly-contribution" className="font-body text-[14px] text-ink">Monthly contribution</label>
                <span className="font-mono text-[14px] text-positive">${reserve.monthlyTarget.toLocaleString()}</span>
              </div>
              <input
                id="reserve-monthly-contribution"
                type="range"
                min={100}
                max={2500}
                step={50}
                value={reserve.monthlyTarget}
                onChange={(e) => setData({ ...reserve, monthlyTarget: Number(e.target.value) })}
                onMouseUp={() => updateReserve({ monthlyTarget: reserve.monthlyTarget })}
                onTouchEnd={() => updateReserve({ monthlyTarget: reserve.monthlyTarget })}
                onKeyUp={() => updateReserve({ monthlyTarget: reserve.monthlyTarget })}
                className="w-full accent-acid cursor-pointer"
              />
              <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)] mt-1">
                At this pace you'll hit your goal in{' '}
                {Math.max(1, Math.ceil((reserve.goal - reserve.current) / reserve.monthlyTarget))} months
              </p>
            </div>
            <div className="flex items-center justify-between bg-panel2 rounded-xl px-4 py-3 self-start">
              <div>
                <p className="font-body text-[14px] text-ink">Auto-contribute</p>
                <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),0.42)]">
                  Move funds automatically on payout days
                </p>
              </div>
              <button
                onClick={() => updateReserve({ autoContribute: !reserve.autoContribute })}
                role="switch"
                aria-checked={reserve.autoContribute}
                className={`relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0 ${reserve.autoContribute ? 'bg-acid' : 'bg-[rgba(var(--fg-rgb),0.12)]'}`}
              >
                <motion.div
                  animate={{ x: reserve.autoContribute ? 20 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white"
                />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

export default function CashFlow() {
  return (
    <div className="space-y-8">
      <AIInsightBanner />
      <ForecastChart />
      <Seasonality />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TaxTrackerCard />
        <ReserveBuilderCard />
      </div>
    </div>
  );
}
