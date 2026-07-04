import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Upload,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import type { Advance, AdvancesOverview } from '@/lib/types';
import { ErrorNotice, SkeletonBlock } from '@/components/Skeletons';

/* ------------------------------------------------------------------ */
/*  Static presentation data                                           */
/* ------------------------------------------------------------------ */
const ADVANCE_PRESETS = [250, 500, 1000, 2500, 5000, 10000];

interface SponsorshipDeal {
  brand: string;
  amount: number;
  status: 'Verified' | 'Pending verification';
}

const INITIAL_DEALS: SponsorshipDeal[] = [
  { brand: 'Nike Creator Campaign', amount: 8000, status: 'Verified' },
  { brand: 'Spotify Wrapped Feature', amount: 3500, status: 'Pending verification' },
];

const EQUIPMENT_PURCHASES = [
  { item: 'Sony A7IV Camera', date: 'Oct 1', amount: 2498, status: '4/6 payments' },
  { item: 'Elgato Key Light', date: 'Sep 15', amount: 199, status: 'Paid off' },
  { item: 'Rode Mic NT-USB+', date: 'Sep 10', amount: 169, status: '3/6 payments' },
  { item: 'Shure MV7', date: 'Aug 20', amount: 249, status: '2/6 payments' },
];

const CREDIT_LINE_TOTAL = 5000;
const CREDIT_LINE_USED = 2500;

/* ------------------------------------------------------------------ */
/*  Status badge helpers                                               */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Completed': { bg: 'rgba(var(--positive-rgb),0.15)', text: 'rgb(var(--color-positive))' },
    'Active': { bg: 'rgba(var(--positive-rgb),0.15)', text: 'rgb(var(--color-positive))' },
    'Pending': { bg: 'rgba(var(--gold-rgb),0.15)', text: 'rgb(var(--color-gold))' },
    'Repaid': { bg: 'rgba(var(--electric-rgb),0.15)', text: 'rgb(var(--color-electric))' },
    'Defaulted': { bg: 'rgba(var(--negative-rgb),0.15)', text: 'rgb(var(--color-negative))' },
    'Verified': { bg: 'rgba(var(--positive-rgb),0.15)', text: 'rgb(var(--color-positive))' },
    'Pending verification': { bg: 'rgba(var(--gold-rgb),0.15)', text: 'rgb(var(--color-gold))' },
  };
  const c = config[status] || config['Pending'];
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em]" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function percentRepaid(advance: Advance): number {
  if (advance.total <= 0) return 0;
  return Math.round((advance.repaid / advance.total) * 100);
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */
function AdvancesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl px-7 py-5">
        <SkeletonBlock className="h-6 w-2/3 mb-3" />
        <SkeletonBlock className="h-3 w-40" />
      </div>
      <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-[20px] p-8">
        <SkeletonBlock className="h-10 w-64 mb-4" />
        <SkeletonBlock className="h-4 w-96 mb-6" />
        <div className="flex gap-3 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-11 w-24" />
          ))}
        </div>
        <SkeletonBlock className="h-14 w-52" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Advances component                                            */
/* ------------------------------------------------------------------ */
export default function Advances() {
  const { data: overview, loading, error, refresh, setData } = useApi<AdvancesOverview>('/advances');

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');
  const [applying, setApplying] = useState(false);
  const [deals, setDeals] = useState<SponsorshipDeal[]>(INITIAL_DEALS);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealBrand, setDealBrand] = useState('');
  const [dealAmount, setDealAmount] = useState('');

  if (error) {
    return (
      <div className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl">
        <ErrorNotice message={error} onRetry={refresh} />
      </div>
    );
  }

  if (loading || !overview) {
    return <AdvancesSkeleton />;
  }

  const { eligibility, active, history } = overview;

  const advanceAmount = selectedAmount || parseFloat(customAmount) || 0;
  const fee = advanceAmount * (eligibility.feePercent / 100);
  const totalRepay = advanceAmount + fee;
  const monthlyIncome = 8200;
  const repaymentPercent = 10;
  const monthlyDeduction = monthlyIncome * (repaymentPercent / 100);
  const payoffMonths = monthlyDeduction > 0 ? Math.ceil(totalRepay / monthlyDeduction) : 0;

  const isEligible = eligibility.eligible;
  const isNearLimit = eligibility.used / eligibility.maxAmount >= 0.8;

  const filteredHistory = historyFilter === 'All'
    ? history
    : history.filter((h) => h.status === historyFilter);

  const handleApply = async () => {
    setApplying(true);
    try {
      const updated = await api.post<AdvancesOverview>('/advances/apply', { amount: advanceAmount });
      setData(updated);
      toast.success(`Advance approved — $${advanceAmount.toLocaleString()} is on the way to your USD wallet`);
      setSelectedAmount(null);
      setCustomAmount('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Application failed — try again');
    } finally {
      setApplying(false);
    }
  };

  const handleAddDeal = () => {
    const amount = parseFloat(dealAmount) || 0;
    if (!dealBrand.trim() || amount <= 0) {
      toast.error('Enter a brand name and deal amount');
      return;
    }
    setDeals((prev) => [...prev, { brand: dealBrand.trim(), amount, status: 'Pending verification' }]);
    toast.success(`${dealBrand.trim()} submitted for verification`);
    setDealBrand('');
    setDealAmount('');
    setShowDealForm(false);
  };

  return (
    <div className="space-y-8">
      {/* ── Section 1: Eligibility Banner ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl px-7 py-5 overflow-hidden"
        style={{ borderLeft: `3px solid ${isEligible ? 'rgb(var(--color-positive))' : isNearLimit ? 'rgb(var(--color-gold))' : 'rgb(var(--color-negative))'}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              {isEligible ? (
                <CheckCircle2 size={28} className="text-positive" />
              ) : isNearLimit ? (
                <AlertTriangle size={28} className="text-[rgb(var(--color-gold))]" />
              ) : (
                <Lock size={28} className="text-negative" />
              )}
            </motion.div>
            <div>
              <h4 className={`font-body text-[18px] font-semibold ${isEligible ? 'text-positive' : isNearLimit ? 'text-[rgb(var(--color-gold))]' : 'text-negative'}`}>
                {isEligible
                  ? `You're approved for advances up to $${eligibility.available.toLocaleString()}`
                  : isNearLimit
                  ? `You're at ${Math.round((eligibility.used / eligibility.maxAmount) * 100)}% of your advance limit`
                  : 'Advance unavailable — improve your CCS score'}
              </h4>
              <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)]">
                ${eligibility.used.toLocaleString()} / ${eligibility.maxAmount.toLocaleString()} used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full font-mono text-[12px] tracking-[0.04em] bg-[rgba(var(--electric-rgb),0.15)] text-electric">
              CCS: {eligibility.ccsScore} — {eligibility.tier}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(eligibility.used / eligibility.maxAmount) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="h-full rounded-full"
            style={{ background: isNearLimit ? 'linear-gradient(90deg, rgb(var(--color-gold)), rgb(var(--color-ember)))' : 'linear-gradient(90deg, rgb(var(--color-acid)), rgb(var(--color-electric)))' }}
          />
        </div>
      </motion.div>

      {/* ── Section 2: Quick Apply ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative rounded-[20px] p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--ember-rgb),0.04) 100%)',
          border: '1px solid rgba(var(--ember-rgb),0.15)',
        }}
      >
        <h2 className="font-display text-[48px] tracking-[0.02em] text-ink mb-2">Get an Advance</h2>
        <p className="font-body text-[18px] text-[rgba(var(--fg-rgb),0.42)] mb-6">
          Access up to 60% of your projected monthly income instantly
        </p>

        {/* Amount selector */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {ADVANCE_PRESETS.map((amt) => (
              <motion.button
                key={amt}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                className={`px-6 py-3 rounded-xl font-mono text-[14px] font-medium transition-all border ${
                  selectedAmount === amt
                    ? 'bg-acid text-void border-acid'
                    : 'bg-transparent text-ink border-[rgba(var(--fg-rgb),0.2)] hover:border-[rgba(var(--fg-rgb),0.4)] hover:bg-[rgba(var(--fg-rgb),0.06)]'
                }`}
              >
                ${amt.toLocaleString()}
              </motion.button>
            ))}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[20px] text-[rgba(var(--fg-rgb),0.4)]">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                placeholder="Custom"
                className="bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl pl-8 pr-4 py-3 font-mono text-[16px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric focus:shadow-[0_0_0_3px_rgba(var(--electric-rgb),0.15)] outline-none transition-all w-40"
              />
            </div>
          </div>
          <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)]">
            Fee: {eligibility.feePercent}% (${fee.toFixed(2)}) • Total repayment: ${totalRepay.toFixed(2)} • Est. {payoffMonths} month{payoffMonths !== 1 ? 's' : ''} at {repaymentPercent}% of income
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!isEligible || applying || advanceAmount <= 0 || advanceAmount > eligibility.available}
            onClick={handleApply}
            className="flex items-center gap-2 bg-ember text-white font-body text-[16px] font-semibold px-8 py-4 rounded-2xl transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying && <Loader2 size={18} className="animate-spin" />}
            Apply for ${advanceAmount > 0 ? advanceAmount.toLocaleString() : '...'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Section 3: Active Advances ── */}
      {active.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Active Advances</h3>
          {active.map((advance) => (
            <motion.div
              key={advance.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[14px] text-electric font-medium">{advance.id}</span>
                    <StatusBadge status={`${advance.status}${advance.status === 'Active' ? ' — Repaying' : ''}`} />
                  </div>
                  <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em] mt-1">
                    Issued {advance.issued} • {advance.repaymentRate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[24px] font-medium text-ink">${advance.amount.toLocaleString()}</p>
                  <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">+${advance.fee} fee ({advance.feePercent}%)</p>
                </div>
              </div>
              <div className="h-2 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentRepaid(advance)}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="h-full rounded-full bg-gradient-to-r from-acid to-electric"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">${advance.repaid.toLocaleString()} repaid</span>
                <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">${advance.total.toLocaleString()} total</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Section 4: Sponsor-Backed Credit ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[rgba(var(--violet-rgb),0.15)] flex items-center justify-center">
            <Upload size={20} style={{ color: 'rgb(var(--color-violet))' }} />
          </div>
          <div>
            <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Sponsor-Backed Credit</h3>
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
              Upload signed brand deals to increase your advance limit
            </p>
          </div>
        </div>

        {deals.length > 0 ? (
          <div className="space-y-3 mb-6">
            {deals.map((deal) => (
              <div key={deal.brand} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
                <div>
                  <p className="font-body text-[14px] text-ink">{deal.brand}</p>
                  <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">${deal.amount.toLocaleString()}</p>
                </div>
                <StatusBadge status={deal.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <p className="font-body text-[14px] text-[rgba(var(--fg-rgb),0.42)]">No deals uploaded yet</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {showDealForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={dealBrand}
                  onChange={(e) => setDealBrand(e.target.value)}
                  placeholder="Brand / campaign name"
                  className="flex-1 bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-3 font-body text-[14px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric outline-none transition-colors"
                />
                <input
                  type="number"
                  value={dealAmount}
                  onChange={(e) => setDealAmount(e.target.value)}
                  placeholder="Deal amount ($)"
                  className="sm:w-44 bg-surface border border-[rgba(var(--fg-rgb),0.1)] rounded-xl px-4 py-3 font-mono text-[14px] text-ink placeholder:text-[rgba(var(--fg-rgb),0.2)] focus:border-electric outline-none transition-colors"
                />
                <button
                  onClick={handleAddDeal}
                  className="bg-acid text-void font-body text-[14px] font-semibold px-6 py-3 rounded-xl hover:brightness-110 transition-all"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDealForm((v) => !v)}
          className="w-full py-3 rounded-xl border border-dashed border-[rgba(var(--fg-rgb),0.2)] text-[rgba(var(--fg-rgb),0.42)] hover:text-ink hover:border-[rgba(var(--fg-rgb),0.4)] transition-all font-body text-[14px]"
        >
          {showDealForm ? 'Cancel' : '+ Upload Signed Contract'}
        </motion.button>
      </motion.div>

      {/* ── Section 5: Equipment Credit Line ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(var(--electric-rgb),0.15)] flex items-center justify-center">
              <ShoppingBag size={20} style={{ color: 'rgb(var(--color-electric))' }} />
            </div>
            <div>
              <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Equipment Credit</h3>
              <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">
                ${CREDIT_LINE_USED.toLocaleString()} / ${CREDIT_LINE_TOTAL.toLocaleString()} used
              </p>
            </div>
          </div>
          <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)]">
            {Math.round((CREDIT_LINE_USED / CREDIT_LINE_TOTAL) * 100)}%
          </span>
        </div>

        <div className="h-2 bg-[rgba(var(--fg-rgb),0.06)] rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${(CREDIT_LINE_USED / CREDIT_LINE_TOTAL) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="h-full rounded-full bg-gradient-to-r from-electric to-violet"
          />
        </div>

        <div className="space-y-3">
          {EQUIPMENT_PURCHASES.map((purchase) => (
            <div key={purchase.item} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
              <div>
                <p className="font-body text-[14px] text-ink">{purchase.item}</p>
                <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">{purchase.date} • ${purchase.amount.toLocaleString()}</p>
              </div>
              <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">{purchase.status}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 6: Advance History ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Advance History</h3>
          <div className="flex gap-2">
            {['All', 'Active', 'Repaid'].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-4 py-2 rounded-lg font-mono text-[12px] tracking-[0.04em] transition-all ${
                  historyFilter === f
                    ? 'bg-acid text-void'
                    : 'text-[rgba(var(--fg-rgb),0.42)] hover:text-ink hover:bg-[rgba(var(--fg-rgb),0.06)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <p className="text-center py-8 font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">
              No {historyFilter !== 'All' ? historyFilter.toLowerCase() : ''} advances
            </p>
          ) : (
            filteredHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[14px] text-ink font-medium">{h.id}</span>
                    <StatusBadge status={h.status} />
                  </div>
                  <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)] tracking-[0.04em]">{h.issued}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[14px] text-ink">${h.amount.toLocaleString()}</p>
                  <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),0.42)]">${h.repaid.toLocaleString()} repaid</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
