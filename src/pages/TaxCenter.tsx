/*
 * C3 — Tax Center. Quarterly estimate calculator, 1099-K tracker, and a
 * TurboTax connect / CSV export card. All data flows through the api
 * layer (GET /tax/summary, GET /tax/1099k, POST /tax/turbotax/connect,
 * PUT /tax/estimates).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Download, FileCheck2, Landmark, Link2, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { FilingStatus, TaxEstimateSettings, TaxSummary, Ten99kRow } from '@/lib/types';
import { ErrorNotice, SkeletonBlock, TransactionListSkeleton } from '@/components/Skeletons';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married_joint', label: 'Married filing jointly' },
  { value: 'married_separate', label: 'Married filing separately' },
  { value: 'head_of_household', label: 'Head of household' },
];

function usd(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function StatusBadge({ label, tone }: { label: string; tone: 'positive' | 'warning' | 'muted' }) {
  const config = {
    positive: { bg: 'rgba(var(--positive-rgb),0.15)', text: 'rgb(var(--color-positive))' },
    warning: { bg: 'rgba(var(--gold-rgb),0.15)', text: 'rgb(var(--color-gold))' },
    muted: { bg: 'rgba(var(--fg-rgb),0.08)', text: 'rgba(var(--fg-rgb),0.55)' },
  }[tone];
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em] whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — QUARTERLY ESTIMATE CALCULATOR                  */
/* ═══════════════════════════════════════════════════════════ */
function QuarterlyCalculator({
  summary,
  loading,
  error,
  refresh,
  setData,
}: {
  summary: TaxSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setData: (data: TaxSummary) => void;
}) {
  const [pendingRate, setPendingRate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const saveEstimates = async (patch: Partial<TaxEstimateSettings>) => {
    setSaving(true);
    try {
      const updated = await api.put<TaxSummary>('/tax/estimates', patch);
      setData(updated);
      toast.success('Tax estimates updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update tax estimates');
    } finally {
      setSaving(false);
      setPendingRate(null);
    }
  };

  const rate = pendingRate ?? summary?.settings.effectiveRatePercent ?? 24;
  // Live preview while the slider is being dragged; server values otherwise.
  const previewTotal = summary ? Math.round(summary.ytdIncome * (rate / 100)) : 0;
  const totalEstimated = pendingRate !== null ? previewTotal : summary?.totalEstimated ?? 0;
  const reserved = summary ? Math.min(summary.reserved, totalEstimated) : 0;
  const stillNeeded = Math.max(0, totalEstimated - reserved);
  const coveredPercent = totalEstimated > 0 ? Math.min(100, (reserved / totalEstimated) * 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[rgba(var(--gold-rgb),0.15)] flex items-center justify-center">
          <Landmark size={20} style={{ color: 'rgb(var(--color-gold))' }} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[36px] tracking-[0.02em] text-ink">Quarterly Estimates</h2>
          <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
            {summary ? `Estimated payments for tax year ${summary.taxYear}` : 'Estimated payments'}
          </p>
        </div>
        {saving && <Loader2 size={18} className="animate-spin text-acid" />}
      </div>

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20 w-full" />
            ))}
          </div>
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'YTD Income', value: usd(summary.ytdIncome), color: 'text-ink' },
              { label: 'Est. Total Owed', value: usd(totalEstimated), color: 'text-ink' },
              { label: 'Already Reserved', value: usd(reserved), color: 'text-positive' },
              { label: 'Still Needed', value: usd(stillNeeded), color: stillNeeded > 0 ? 'text-ember' : 'text-positive' },
            ].map((stat) => (
              <div key={stat.label} className="bg-panel2 rounded-xl p-4">
                <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-1">
                  {stat.label}
                </p>
                <p className={`font-mono text-[18px] font-medium tracking-[-0.02em] ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-[14px] text-ink">Effective tax rate</span>
                <span className="font-mono text-[14px] text-acid">{rate}%</span>
              </div>
              <input
                id="effective-tax-rate"
                aria-label="Effective tax rate"
                type="range"
                min={10}
                max={50}
                step={1}
                value={rate}
                disabled={saving}
                onChange={(e) => setPendingRate(Number(e.target.value))}
                onMouseUp={() => saveEstimates({ effectiveRatePercent: rate })}
                onTouchEnd={() => saveEstimates({ effectiveRatePercent: rate })}
                onKeyUp={() => saveEstimates({ effectiveRatePercent: rate })}
                className="w-full accent-acid cursor-pointer"
              />
              <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-1">
                Federal + state + self-employment combined
              </p>
            </div>
            <div>
              <label className="block font-body text-[14px] text-ink mb-1.5" htmlFor="filing-status">
                Filing status
              </label>
              <select
                id="filing-status"
                value={summary.settings.filingStatus}
                disabled={saving}
                onChange={(e) => saveEstimates({ filingStatus: e.target.value as FilingStatus })}
                className="w-full bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] rounded-xl px-4 py-2.5 font-body text-[14px] text-ink focus:outline-none focus:border-acid focus-visible:ring-2 focus-visible:ring-acid cursor-pointer"
              >
                {FILING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-panel2 text-ink">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
              {Math.round(coveredPercent)}% of estimated taxes reserved
            </span>
            <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
              {(() => {
                const nextDue = summary.quarters.find((q) => q.status !== 'Covered');
                return nextDue ? `Next due: ${nextDue.dueDate}` : 'All quarters covered';
              })()}
            </span>
          </div>
          <div className="h-2.5 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coveredPercent}%` }}
              transition={{ duration: 0.8, ease: easeOutExpo }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgb(var(--color-gold)), rgb(var(--color-acid)))' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.quarters.map((q) => {
              const amount = pendingRate !== null ? Math.round(previewTotal / 4) : q.amount;
              return (
                <div key={q.quarter} className="bg-panel2 rounded-xl p-4 border border-[rgba(var(--fg-rgb),0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-[24px] tracking-[0.02em] text-ink">{q.quarter}</span>
                    <StatusBadge
                      label={q.status}
                      tone={q.status === 'Covered' ? 'positive' : q.status === 'Partial' ? 'warning' : 'muted'}
                    />
                  </div>
                  <p className="font-mono text-[22px] font-medium text-ink tracking-[-0.02em] mb-2">
                    {usd(amount)}
                  </p>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">
                    <CalendarClock size={12} className="flex-shrink-0" />
                    Due {q.dueDate}
                  </div>
                  <p className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] mt-1">{q.period}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — 1099-K TRACKER                                 */
/* ═══════════════════════════════════════════════════════════ */
function Ten99kTracker() {
  const { data: rows, loading, error, refresh } = useApi<Ten99kRow[]>('/tax/1099k');

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[rgba(var(--electric-rgb),0.15)] flex items-center justify-center">
          <FileCheck2 size={20} className="text-electric" />
        </div>
        <div>
          <h2 className="font-display text-[36px] tracking-[0.02em] text-ink">1099-K Tracker</h2>
          <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
            Gross payments per platform vs the federal reporting threshold
          </p>
        </div>
      </div>

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading || !rows ? (
        <TransactionListSkeleton rows={6} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[rgba(var(--fg-rgb),0.08)]">
                {['Platform', 'Gross Payments', 'Transactions', 'Threshold Progress', 'Expected Form'].map((h) => (
                  <th
                    key={h}
                    className="text-left font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] uppercase pb-3 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const progress = Math.min(100, (row.grossPayments / row.threshold) * 100);
                return (
                  <tr key={row.platform} className="border-b border-[rgba(var(--fg-rgb),0.04)] last:border-0">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                        <span className="font-body text-[14px] font-medium text-ink">{row.platform}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-mono text-[14px] text-ink tracking-[-0.02em]">
                      {usd(row.grossPayments)}
                    </td>
                    <td className="py-4 pr-4 font-mono text-[14px] text-[rgba(var(--fg-rgb),0.6)]">
                      {row.transactionCount}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <div className="flex-1 h-2 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: progress >= 100 ? 'rgb(var(--color-acid))' : progress >= 60 ? 'rgb(var(--color-gold))' : 'rgba(var(--electric-rgb),0.6)',
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] w-[72px] flex-shrink-0">
                          {Math.round(progress)}% of {usd(row.threshold)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <StatusBadge
                        label={row.formStatus}
                        tone={row.formStatus === 'Expected' ? 'positive' : row.formStatus === 'On track' ? 'warning' : 'muted'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 3 — TURBOTAX INTEGRATION + CSV EXPORT              */
/* ═══════════════════════════════════════════════════════════ */

function buildTaxCsv(summary: TaxSummary, rows: Ten99kRow[]): string {
  const lines: string[] = [];
  lines.push(`Kre8trix Tax Summary,Tax Year ${summary.taxYear}`);
  lines.push('');
  lines.push('Section,Metric,Value');
  lines.push(`Overview,YTD Income,${summary.ytdIncome}`);
  lines.push(`Overview,Effective Tax Rate (%),${summary.settings.effectiveRatePercent}`);
  lines.push(`Overview,Filing Status,${summary.settings.filingStatus}`);
  lines.push(`Overview,Estimated Total Owed,${summary.totalEstimated}`);
  lines.push(`Overview,Already Reserved,${summary.reserved}`);
  lines.push(`Overview,Still Needed,${summary.stillNeeded}`);
  lines.push('');
  lines.push('Quarter,Period,Due Date,Estimated Payment,Reserved,Status');
  for (const q of summary.quarters) {
    lines.push(`${q.quarter},"${q.period}","${q.dueDate}",${q.amount},${q.reserved},${q.status}`);
  }
  lines.push('');
  lines.push('Platform,Gross Payments,Transactions,1099-K Threshold,Expected Form');
  for (const r of rows) {
    lines.push(`${r.platform},${r.grossPayments},${r.transactionCount},${r.threshold},${r.formStatus}`);
  }
  return lines.join('\n');
}

function TurboTaxCard({
  summary,
  setData,
}: {
  summary: TaxSummary | null;
  setData: (data: TaxSummary) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const connected = summary?.turbotax.connected ?? false;

  const connect = async () => {
    setConnecting(true);
    try {
      const connection = await api.post<TaxSummary['turbotax']>('/tax/turbotax/connect');
      if (summary) setData({ ...summary, turbotax: connection });
      toast.success('TurboTax connected — your tax data will sync automatically');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not connect to TurboTax');
    } finally {
      setConnecting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const [taxSummary, rows] = await Promise.all([
        api.get<TaxSummary>('/tax/summary'),
        api.get<Ten99kRow[]>('/tax/1099k'),
      ]);
      const csv = buildTaxCsv(taxSummary, rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kre8trix-tax-summary-${taxSummary.taxYear}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Tax summary CSV downloaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not export tax summary');
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="rounded-2xl p-6 border border-[rgba(var(--electric-rgb),0.15)]"
      style={{ background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--electric-rgb),0.05) 100%)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-electric)), rgb(var(--color-acid)))' }}
          >
            <Receipt size={24} className="text-void" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display text-[36px] tracking-[0.02em] text-ink">TurboTax</h2>
              {connected && <StatusBadge label="Connected" tone="positive" />}
            </div>
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
              {connected && summary?.turbotax.account
                ? `Linked to ${summary.turbotax.account} · last sync ${summary.turbotax.lastSync}`
                : 'Send your creator income and quarterly estimates straight to TurboTax'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={connect}
            disabled={connecting || connected}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[14px] font-semibold transition-all ${
              connected
                ? 'bg-[rgba(var(--positive-rgb),0.15)] text-positive cursor-default'
                : 'bg-electric text-void hover:brightness-110 disabled:opacity-60'
            }`}
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {connected ? 'Connected' : connecting ? 'Connecting…' : 'Connect TurboTax'}
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[14px] font-semibold bg-acid text-void hover:brightness-110 transition-all disabled:opacity-60"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export tax summary (CSV)
          </button>
        </div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                       */
/* ═══════════════════════════════════════════════════════════ */
export default function TaxCenter() {
  const { data: summary, loading, error, refresh, setData } = useApi<TaxSummary>('/tax/summary');

  return (
    <div className="space-y-8">
      {/* The page title lives in the top bar — just the descriptive lead-in here. */}
      <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
        Quarterly estimates, 1099-K coverage, and filing integrations
      </p>
      <QuarterlyCalculator summary={summary} loading={loading} error={error} refresh={refresh} setData={setData} />
      <Ten99kTracker />
      <TurboTaxCard summary={summary} setData={setData} />
    </div>
  );
}
