/*
 * C2 — Brand deal marketplace. Browse sponsorship offers, inspect the
 * full terms, apply with a short pitch, and track applications. Accepted
 * or high-value deals surface a "Get sponsorship advance" CTA → /advances.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Search,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { BrandDeal, DealApplication, DealApplyResponse, DealSort } from '@/lib/types';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const CATEGORIES = ['All', 'Tech', 'Fashion', 'Gaming', 'Beauty', 'Fitness', 'Food', 'Finance', 'Travel'];

const SORT_OPTIONS: { value: DealSort; label: string }[] = [
  { value: 'match', label: 'Best match' },
  { value: 'payout', label: 'Payout' },
  { value: 'deadline', label: 'Deadline' },
];

/** Deals at or above this payout ceiling qualify for the advance CTA. */
const HIGH_VALUE_THRESHOLD = 5000;

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function brandInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function payoutRange(deal: { payoutMin: number; payoutMax: number }): string {
  return `$${deal.payoutMin.toLocaleString()} – $${deal.payoutMax.toLocaleString()}`;
}

function formatDeadline(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysLeft(iso: string): number {
  const target = new Date(`${iso}T00:00:00`).getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}

function matchColor(score: number): string {
  if (score >= 80) return '#C8FF00';
  if (score >= 65) return '#00D4FF';
  return 'rgba(255,255,255,0.42)';
}

function BrandLogo({ name, color, size = 48 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="rounded-xl flex items-center justify-center font-display flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color,
        backgroundColor: `${color}26`,
        border: `1px solid ${color}40`,
        letterSpacing: '0.04em',
      }}
    >
      {brandInitials(name)}
    </span>
  );
}

function StatusBadge({ status }: { status: 'Pending' | 'Accepted' | 'Applied' }) {
  const config: Record<string, { bg: string; text: string }> = {
    Accepted: { bg: 'rgba(0,229,160,0.15)', text: '#00E5A0' },
    Pending: { bg: 'rgba(255,212,0,0.15)', text: '#FFD400' },
    Applied: { bg: 'rgba(0,212,255,0.15)', text: '#00D4FF' },
  };
  const c = config[status];
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em]"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

function AdvanceCta({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`inline-flex items-center gap-2 bg-ember text-white font-body font-semibold rounded-xl transition-all hover:brightness-110 ${
        compact ? 'text-[13px] px-4 py-2' : 'text-[14px] px-5 py-3'
      }`}
    >
      <Zap size={compact ? 14 : 16} />
      Get sponsorship advance
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DealGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-pulse w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.06)]" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          </div>
          <SkeletonBlock className="h-3 w-full mb-2" />
          <SkeletonBlock className="h-3 w-3/4 mb-4" />
          <div className="flex justify-between">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal detail panel                                                  */
/* ------------------------------------------------------------------ */

function DealDetail({
  deal,
  application,
  onClose,
  onApplied,
}: {
  deal: BrandDeal;
  application: DealApplication | undefined;
  onClose: () => void;
  onApplied: () => void;
}) {
  const navigate = useNavigate();
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const accepted = application?.status === 'Accepted';
  const showAdvanceCta = accepted || deal.payoutMax >= HIGH_VALUE_THRESHOLD;
  const remaining = daysLeft(deal.deadline);

  const handleApply = async () => {
    setSubmitting(true);
    try {
      await api.post<DealApplyResponse>(`/marketplace/deals/${deal.id}/apply`, { pitch });
      toast.success(`Application sent to ${deal.brand}`);
      setPitch('');
      onApplied();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Application failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="overflow-hidden"
    >
      <div
        className="bg-panel rounded-2xl p-6 md:p-8"
        style={{ border: `1px solid ${deal.brandColor}40` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BrandLogo name={deal.brand} color={deal.brandColor} size={64} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-[32px] tracking-[0.02em] text-white leading-none">{deal.brand}</h3>
                {application && <StatusBadge status={application.status} />}
              </div>
              <p className="font-body text-[15px] text-[rgba(255,255,255,0.62)] mt-1">{deal.tagline}</p>
              <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] mt-1">
                {deal.category} • Apply by {formatDeadline(deal.deadline)}
                {remaining > 0 && ` (${remaining}d left)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
            aria-label="Close deal details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h4 className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-2">About the brand</h4>
              <p className="font-body text-[14px] text-[rgba(255,255,255,0.72)] leading-relaxed">{deal.brandAbout}</p>
            </div>
            <div>
              <h4 className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-2">Deliverables</h4>
              <ul className="space-y-1.5">
                {deal.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 font-body text-[14px] text-white">
                    <CheckCircle2 size={15} className="text-acid flex-shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-2">Requirements</h4>
              <ul className="space-y-1.5">
                {deal.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 font-body text-[14px] text-[rgba(255,255,255,0.72)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric flex-shrink-0 mt-[7px]" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-panel2 rounded-xl p-5">
              <p className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-1">Payout range</p>
              <p className="font-mono text-[24px] font-medium text-acid">{payoutRange(deal)}</p>
            </div>
            <div className="bg-panel2 rounded-xl p-5">
              <p className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-2">Payout terms</p>
              <p className="font-body text-[13px] text-[rgba(255,255,255,0.72)] leading-relaxed">{deal.payoutTerms}</p>
            </div>
            <div className="bg-panel2 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase mb-1">Match score</p>
                <p className="font-mono text-[24px] font-medium" style={{ color: matchColor(deal.matchScore) }}>
                  {deal.matchScore}%
                </p>
              </div>
              <Sparkles size={22} style={{ color: matchColor(deal.matchScore) }} />
            </div>
          </div>
        </div>

        {/* Apply / applied footer */}
        {deal.applied ? (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className={accepted ? 'text-positive' : 'text-electric'} />
              <p className="font-body text-[14px] text-white">
                {accepted
                  ? 'Accepted — the brand wants to work with you. Funds arrive on the deal terms above.'
                  : `Application submitted${application ? ` on ${application.submitted}` : ''} — the brand usually responds within 5 days.`}
              </p>
            </div>
            {showAdvanceCta && <AdvanceCta onClick={() => navigate('/advances')} />}
          </div>
        ) : (
          <div className="pt-5 border-t border-[rgba(255,255,255,0.08)] space-y-3">
            <label htmlFor="deal-pitch" className="font-mono text-[12px] tracking-[0.08em] text-[rgba(255,255,255,0.42)] uppercase block">
              Your pitch
            </label>
            <textarea
              id="deal-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={3}
              placeholder={`Tell ${deal.brand} why your audience is the right fit (min. 10 characters)...`}
              className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 font-body text-[14px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] outline-none transition-all resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting || pitch.trim().length < 10}
                onClick={handleApply}
                className="flex items-center gap-2 bg-acid text-void font-body text-[15px] font-semibold px-6 py-3 rounded-xl transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Apply to {deal.brand}
              </motion.button>
              {showAdvanceCta && (
                <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">
                  High-value deal — eligible for a sponsorship advance once accepted
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Marketplace page                                              */
/* ------------------------------------------------------------------ */

export default function Marketplace() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'browse' | 'applications'>('browse');
  const [category, setCategory] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DealSort>('match');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const dealsPath = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    params.set('sort', sort);
    return `/marketplace/deals?${params.toString()}`;
  }, [category, search, sort]);

  const dealsQuery = useApi<BrandDeal[]>(dealsPath);
  const appsQuery = useApi<DealApplication[]>('/marketplace/applications');

  const deals = dealsQuery.data ?? [];
  const applications = useMemo(() => appsQuery.data ?? [], [appsQuery.data]);
  const applicationByDeal = useMemo(
    () => new Map(applications.map((a) => [a.dealId, a])),
    [applications],
  );
  const selectedDeal = deals.find((d) => d.id === selectedId) ?? null;

  const handleApplied = () => {
    dealsQuery.refresh();
    appsQuery.refresh();
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <h1 className="font-display text-[48px] tracking-[0.02em] text-white leading-none">Brand Deal Marketplace</h1>
        <p className="font-body text-[16px] text-[rgba(255,255,255,0.42)] mt-2">
          Sponsorships matched to your audience — apply in one pitch, get paid through your wallet
        </p>
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {([
          { key: 'browse', label: 'Browse Deals' },
          { key: 'applications', label: `Applications (${applications.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-body text-[14px] font-medium transition-all ${
              tab === t.key
                ? 'bg-acid text-void'
                : 'text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' ? (
        <>
          {/* ── Filters ── */}
          <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search brands, campaigns, categories..."
                  className="w-full bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl pl-11 pr-4 py-3 font-body text-[14px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-[rgba(255,255,255,0.3)] flex-shrink-0" />
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    className={`px-4 py-2 rounded-lg font-mono text-[12px] tracking-[0.04em] transition-all ${
                      sort === opt.value
                        ? 'bg-[rgba(0,212,255,0.15)] text-electric'
                        : 'text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full font-mono text-[12px] tracking-[0.04em] transition-all border ${
                    category === c
                      ? 'bg-acid text-void border-acid'
                      : 'text-[rgba(255,255,255,0.42)] border-[rgba(255,255,255,0.12)] hover:text-white hover:border-[rgba(255,255,255,0.3)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Deal detail (inline expand) ── */}
          <AnimatePresence initial={false}>
            {selectedDeal && (
              <DealDetail
                key={selectedDeal.id}
                deal={selectedDeal}
                application={applicationByDeal.get(selectedDeal.id)}
                onClose={() => setSelectedId(null)}
                onApplied={handleApplied}
              />
            )}
          </AnimatePresence>

          {/* ── Deal grid ── */}
          {dealsQuery.error ? (
            <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl">
              <ErrorNotice message={dealsQuery.error} onRetry={dealsQuery.refresh} />
            </div>
          ) : dealsQuery.loading && deals.length === 0 ? (
            <DealGridSkeleton />
          ) : deals.length === 0 ? (
            <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl py-14 text-center">
              <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)]">
                No deals match your filters — try another category or search
              </p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${dealsQuery.loading ? 'opacity-50' : ''}`}>
              {deals.map((deal, i) => {
                const remaining = daysLeft(deal.deadline);
                const selected = deal.id === selectedId;
                return (
                  <motion.button
                    key={deal.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
                    onClick={() => setSelectedId(selected ? null : deal.id)}
                    className={`text-left bg-panel rounded-2xl p-5 transition-all hover:bg-panel2 ${
                      selected ? 'border border-acid' : 'border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <BrandLogo name={deal.brand} color={deal.brandColor} />
                        <div className="min-w-0">
                          <p className="font-body text-[16px] font-semibold text-white truncate">{deal.brand}</p>
                          <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">{deal.category}</p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] tracking-[0.04em] flex-shrink-0"
                        style={{ color: matchColor(deal.matchScore), backgroundColor: `${matchColor(deal.matchScore) === 'rgba(255,255,255,0.42)' ? 'rgba(255,255,255,0.06)' : `${matchColor(deal.matchScore)}26`}` }}
                      >
                        <Sparkles size={11} />
                        {deal.matchScore}%
                      </span>
                    </div>

                    <p className="font-body text-[13px] text-[rgba(255,255,255,0.62)] leading-snug mb-3 line-clamp-2">{deal.tagline}</p>

                    <p className="font-mono text-[11px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] mb-4 truncate">
                      {deal.deliverables.length} deliverable{deal.deliverables.length !== 1 ? 's' : ''} • {deal.deliverables[0]}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[15px] font-medium text-acid">{payoutRange(deal)}</span>
                      {deal.applied ? (
                        <StatusBadge status={applicationByDeal.get(deal.id)?.status ?? 'Applied'} />
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] ${
                            remaining <= 14 ? 'text-ember' : 'text-[rgba(255,255,255,0.42)]'
                          }`}
                        >
                          <CalendarClock size={12} />
                          {remaining > 0 ? `${remaining}d left` : 'Closing'}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Applications tab ── */
        <div className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-white mb-6">Your Applications</h3>
          {appsQuery.error ? (
            <ErrorNotice message={appsQuery.error} onRetry={appsQuery.refresh} />
          ) : appsQuery.loading && applications.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 px-4 rounded-xl bg-panel2">
                  <div className="animate-pulse w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.06)] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-3 w-64" />
                  </div>
                  <SkeletonBlock className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)] mb-4">
                No applications yet — browse deals and send your first pitch
              </p>
              <button
                onClick={() => setTab('browse')}
                className="font-mono text-[12px] tracking-[0.04em] text-electric hover:text-acid transition-colors"
              >
                Browse deals
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-4 rounded-xl bg-panel2"
                >
                  <BrandLogo name={app.brand} color={app.brandColor} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-body text-[15px] font-semibold text-white">{app.brand}</p>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] mt-0.5">
                      {app.category} • {payoutRange(app)} • Submitted {app.submitted}
                    </p>
                    <p className="font-body text-[13px] text-[rgba(255,255,255,0.55)] mt-1.5 line-clamp-2 italic">
                      &ldquo;{app.pitch}&rdquo;
                    </p>
                  </div>
                  {app.status === 'Accepted' && (
                    <div className="flex-shrink-0">
                      <AdvanceCta compact onClick={() => navigate('/advances')} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
