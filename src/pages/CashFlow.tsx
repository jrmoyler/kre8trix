import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BrainCircuit, RefreshCw } from 'lucide-react';
import {
  fetchCashFlowForecast,
  fetchCashFlowInsight,
  fetchSeasonality,
  fetchTaxStatus,
  saveReserveSettings,
} from '@/lib/api/cashflow';
import type {
  CashFlowInsight,
  ForecastDays,
  InsightActionKind,
  ReserveMode,
  SeasonalityData,
  TaxStatus,
} from '@/lib/api/cashflow';
import type { ForecastPoint } from '@/lib/api/types';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const FORECAST_TABS: { label: string; days: ForecastDays }[] = [
  { label: '30D', days: 30 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
];

/* ── data fetching ────────────────────────────────────────── */

/** Fetches an API resource on mount (and whenever `deps` change), exposing
 *  loading (data === null), error, and a retry that refires the request. */
function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, ...deps]);

  return { data, error, retry: () => setRetryKey((k) => k + 1), setData };
}

/* ── shared section states ────────────────────────────────── */

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
      <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-xl bg-acid text-void font-body text-[14px] font-semibold hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — AI INSIGHT BANNER                             */
/* ═══════════════════════════════════════════════════════════ */
const CHIP_STYLES: Record<InsightActionKind, string> = {
  advance: 'bg-[rgba(255,77,0,0.15)] text-[#FF4D00]',
  defer: 'bg-panel2 text-white',
  withholding: 'bg-[rgba(0,212,255,0.15)] text-[#00D4FF]',
};

function AIInsightBanner() {
  const navigate = useNavigate();
  const { data: insight, error, retry } = useApiResource<CashFlowInsight>(fetchCashFlowInsight, []);

  const runAction = (kind: InsightActionKind) => {
    if (kind === 'advance') navigate('/advances');
    else if (kind === 'defer') toast.success('Got it — equipment purchase deferred in your forecast');
    else toast.info('Tax withholding tools coming soon');
  };

  if (error) {
    return (
      <section className="w-full rounded-[20px] border border-[rgba(255,77,0,0.25)] bg-panel">
        <SectionError message={error} onRetry={retry} />
      </section>
    );
  }

  if (insight === null) {
    return <div className="w-full rounded-[20px] h-[188px] animate-pulse bg-surface" aria-busy="true" />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="w-full rounded-[20px] p-7 border border-[rgba(200,255,0,0.1)]"
      style={{
        background: 'linear-gradient(135deg, rgba(200,255,0,0.04), rgba(0,212,255,0.04))',
      }}
    >
      <div className="flex gap-4">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #00D4FF)' }}
        >
          <BrainCircuit size={24} className="text-void" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h5 className="font-body text-[20px] font-semibold text-acid">Kre8trix AI</h5>
            <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">{insight.timeLabel}</span>
          </div>
          <div className="border-l-[3px] border-acid pl-4">
            <p className="font-body text-[18px] text-[#E8E8F0] leading-relaxed">
              {insight.message}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {insight.actions.map((chip) => (
              <button
                key={chip.label}
                onClick={() => runAction(chip.kind)}
                className={`px-4 py-2 rounded-full font-body text-[14px] font-medium transition-all hover:scale-105 ${CHIP_STYLES[chip.kind]}`}
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
  const [activeTab, setActiveTab] = useState(0);
  const [showConfidence, setShowConfidence] = useState(true);
  const days = FORECAST_TABS[activeTab].days;
  const { data, error, retry } = useApiResource<ForecastPoint[]>(
    () => fetchCashFlowForecast(days).then((res) => res.points),
    [days],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-display text-[48px] tracking-[0.02em] text-white">Income Forecast</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1">
            {FORECAST_TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg font-mono text-[12px] font-medium transition-all ${i === activeTab ? 'bg-acid text-void' : 'text-[rgba(255,255,255,0.42)] hover:text-white'}`}
              >
                {tab.label}
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
            <span className="font-body text-[14px] text-[rgba(255,255,255,0.42)]">Confidence bands</span>
          </label>
        </div>
      </div>

      <div style={{ height: 400 }}>
        {error ? (
          <SectionError message={error} onRetry={retry} />
        ) : data === null ? (
          <div className="h-full animate-pulse bg-surface rounded-xl" aria-busy="true" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#C8FF00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{
                  background: '#141428',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              {showConfidence && (
                <>
                  <Area type="monotone" dataKey="projectedHigh" stroke="none" fill="url(#confidenceFill)" />
                  <Area type="monotone" dataKey="projectedLow" stroke="none" fill="#06060E" />
                </>
              )}
              <Area type="monotone" dataKey="actual" stroke="#C8FF00" strokeWidth={2} fill="url(#actualFill)" connectNulls={false} dot={false} />
              <Area type="monotone" dataKey="projected" stroke="#00D4FF" strokeWidth={2} strokeDasharray="6 4" fill="url(#projectedFill)" connectNulls={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 3 — SEASONALITY HEATMAP                           */
/* ═══════════════════════════════════════════════════════════ */
function SeasonalityHeatmap() {
  const { data, error, retry } = useApiResource<SeasonalityData>(fetchSeasonality, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-[36px] tracking-[0.02em] text-white">Seasonality</h2>
        <span className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] tracking-[0.08em]">TRAILING 12 MONTHS</span>
      </div>

      {error ? (
        <SectionError message={error} onRetry={retry} />
      ) : data === null ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" aria-busy="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl h-[84px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {data.months.map((m) => (
              <div
                key={m.month}
                className="rounded-xl p-3 border border-[rgba(255,255,255,0.06)]"
                style={{ background: `rgba(200,255,0,${(0.03 + (m.intensity / 100) * 0.25).toFixed(3)})` }}
              >
                <p className="font-mono text-[11px] tracking-[0.08em] text-[rgba(255,255,255,0.6)]">{m.month.toUpperCase()}</p>
                <p className={`font-mono text-[14px] font-medium mt-3 ${m.vsAverage.startsWith('+') ? 'text-acid' : 'text-[rgba(255,255,255,0.42)]'}`}>
                  {m.vsAverage}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] max-w-[420px]">{data.note}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">LOW</span>
              <div
                className="w-[96px] h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, rgba(200,255,0,0.05), rgba(200,255,0,0.6))' }}
              />
              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">HIGH</span>
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 4 — TAX TRACKER + RESERVE BUILDER                 */
/* ═══════════════════════════════════════════════════════════ */
function TaxSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-4">
        <div className="animate-pulse bg-surface rounded-xl h-[108px]" />
        <div className="animate-pulse bg-surface rounded-xl h-[108px]" />
      </div>
      <div className="animate-pulse bg-surface rounded-xl h-[76px]" />
      <div className="animate-pulse bg-surface rounded-xl h-[104px]" />
    </div>
  );
}

function ReserveBuilder({
  tax,
  setTax,
}: {
  tax: TaxStatus;
  setTax: Dispatch<SetStateAction<TaxStatus | null>>;
}) {
  const { settings } = tax.reserve;
  const [mode, setMode] = useState<ReserveMode>(settings.mode);
  const [value, setValue] = useState(String(settings.mode === 'pct' ? settings.pct : settings.amount));
  const [saving, setSaving] = useState(false);

  const switchMode = (next: ReserveMode) => {
    setMode(next);
    setValue(String(next === 'pct' ? settings.pct : settings.amount));
  };

  const handleSave = async () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || (mode === 'pct' && parsed > 100)) {
      toast.error(mode === 'pct' ? 'Enter a percent between 0 and 100' : 'Enter a positive amount');
      return;
    }
    setSaving(true);
    try {
      const reserve = await saveReserveSettings(mode === 'pct' ? { pct: parsed } : { amount: parsed });
      setTax((prev) => (prev ? { ...prev, reserve } : prev));
      toast.success(
        mode === 'pct'
          ? `Reserve plan saved — ${parsed}% of each payout`
          : `Reserve plan saved — $${parsed.toLocaleString()}/mo`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save your reserve plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-[rgba(255,255,255,0.08)] pt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-body text-[16px] font-semibold text-white">Reserve Builder</p>
        <span className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
          {settings.mode === 'pct' ? `${settings.pct}% OF PAYOUTS` : `$${settings.amount.toLocaleString()}/MO`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1">
          {(
            [
              { key: 'pct', label: '% of payout' },
              { key: 'amount', label: 'Flat $/mo' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => switchMode(opt.key)}
              className={`px-4 py-2 rounded-lg font-mono text-[12px] font-medium transition-all ${mode === opt.key ? 'bg-acid text-void' : 'text-[rgba(255,255,255,0.42)] hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-[rgba(255,255,255,0.42)]">
            {mode === 'pct' ? '%' : '$'}
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            className="w-[130px] bg-panel2 border border-[rgba(255,255,255,0.08)] rounded-xl pl-9 pr-4 py-2 font-mono text-[14px] text-white focus:outline-none focus:border-acid transition-colors"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-acid text-void font-body text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Reserve'}
        </button>
      </div>
    </div>
  );
}

function TaxTracker() {
  const { data: tax, error, retry, setData } = useApiResource<TaxStatus>(fetchTaxStatus, []);
  const reservePct = tax ? Math.min(100, Math.round((tax.reserve.saved / tax.reserve.target) * 100)) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-[36px] tracking-[0.02em] text-white">Tax Tracker</h2>
        {tax && (
          <span
            className={`px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em] ${
              tax.withholdingEnabled ? 'bg-[rgba(0,229,160,0.12)] text-positive' : 'bg-[rgba(255,77,77,0.12)] text-negative'
            }`}
          >
            {tax.withholdingEnabled ? 'AUTO-WITHHOLDING ON' : 'AUTO-WITHHOLDING OFF'}
          </span>
        )}
      </div>

      {error ? (
        <SectionError message={error} onRetry={retry} />
      ) : tax === null ? (
        <TaxSkeleton />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-panel2 rounded-xl p-4">
              <p className="font-mono text-[11px] tracking-[0.08em] text-[rgba(255,255,255,0.42)]">WITHHOLDING RATE</p>
              <p className="font-display text-[36px] tracking-[0.02em] text-white mt-1">{tax.withholdingRate}%</p>
              <p className="font-body text-[13px] text-[rgba(255,255,255,0.42)]">of every payout, set aside</p>
            </div>
            <div className="bg-panel2 rounded-xl p-4">
              <p className="font-mono text-[11px] tracking-[0.08em] text-[rgba(255,255,255,0.42)]">{tax.quarter.toUpperCase()} ESTIMATE</p>
              <p className="font-display text-[36px] tracking-[0.02em] text-white mt-1">${tax.quarterlyEstimate.toLocaleString()}</p>
              <p className="font-body text-[13px] text-[rgba(255,255,255,0.42)]">due {tax.dueDate}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-body text-[14px] text-[rgba(255,255,255,0.6)]">Reserve progress</p>
              <p className="font-mono text-[13px] text-white">
                ${tax.reserve.saved.toLocaleString()}
                <span className="text-[rgba(255,255,255,0.42)]"> / ${tax.reserve.target.toLocaleString()}</span>
              </p>
            </div>
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${reservePct}%` }}
                transition={{ duration: 0.8, ease: easeOutExpo }}
                className="h-full rounded-full bg-acid"
              />
            </div>
            <p className="font-mono text-[11px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mt-2">{reservePct}% OF TARGET RESERVED</p>
          </div>

          <ReserveBuilder tax={tax} setTax={setData} />
        </div>
      )}
    </motion.section>
  );
}

export default function CashFlow() {
  return (
    <div className="space-y-8">
      <AIInsightBanner />
      <ForecastChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <SeasonalityHeatmap />
        <TaxTracker />
      </div>
    </div>
  );
}
