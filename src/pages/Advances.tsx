import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Upload,
  ShoppingBag,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const CCS_SCORE = 612;
const CCS_TIER = 'Rising';
const MAX_ADVANCE = 5000;
const USED_ADVANCE = 2500;

interface ActiveAdvance {
  id: string;
  amount: number;
  fee: number;
  feePercent: number;
  repaid: number;
  total: number;
  percentRepaid: number;
  issued: string;
  repaymentRate: string;
  estCompletion: string;
  status: string;
}

const ACTIVE_ADVANCES: ActiveAdvance[] = [
  {
    id: 'KRA-2847',
    amount: 500,
    fee: 30,
    feePercent: 6,
    repaid: 318,
    total: 530,
    percentRepaid: 60,
    issued: 'Sep 15, 2024',
    repaymentRate: '10% of monthly income',
    estCompletion: 'Nov 20',
    status: 'Active — Repaying',
  },
];

const ADVANCE_PRESETS = [250, 500, 1000, 2500, 5000, 10000];

interface SponsorshipDeal {
  brand: string;
  amount: number;
  status: 'Verified' | 'Pending verification';
}

const SPONSORSHIP_DEALS: SponsorshipDeal[] = [
  { brand: 'Nike Creator Campaign', amount: 8000, status: 'Verified' },
  { brand: 'Spotify Wrapped Feature', amount: 3500, status: 'Pending verification' },
];

interface EquipmentPurchase {
  item: string;
  date: string;
  amount: number;
  status: string;
}

const EQUIPMENT_PURCHASES: EquipmentPurchase[] = [
  { item: 'Sony A7IV Camera', date: 'Oct 1', amount: 2498, status: '4/6 payments' },
  { item: 'Elgato Key Light', date: 'Sep 15', amount: 199, status: 'Paid off' },
  { item: 'Rode Mic NT-USB+', date: 'Sep 10', amount: 169, status: '3/6 payments' },
  { item: 'Shure MV7', date: 'Aug 20', amount: 249, status: '2/6 payments' },
];

const ADVANCE_HISTORY = [
  { id: 'KRA-2847', date: 'Sep 15, 2024', amount: 2500, fee: 62, repaid: 1125, status: 'Active', completion: 45 },
  { id: 'KRA-2734', date: 'Jul 3, 2024', amount: 1000, fee: 25, repaid: 1025, status: 'Repaid', completion: 100 },
  { id: 'KRA-2601', date: 'May 20, 2024', amount: 3500, fee: 87, repaid: 3587, status: 'Repaid', completion: 100 },
  { id: 'KRA-2489', date: 'Mar 12, 2024', amount: 1500, fee: 37, repaid: 1537, status: 'Repaid', completion: 100 },
];

const CREDIT_LINE_TOTAL = 5000;
const CREDIT_LINE_USED = 2500;

/* ------------------------------------------------------------------ */
/*  Status badge helpers                                               */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Completed': { bg: 'rgba(0,229,160,0.15)', text: '#00E5A0' },
    'Active': { bg: 'rgba(0,229,160,0.15)', text: '#00E5A0' },
    'Active — Repaying': { bg: 'rgba(0,229,160,0.15)', text: '#00E5A0' },
    'Pending': { bg: 'rgba(255,212,0,0.15)', text: '#FFD400' },
    'Repaid': { bg: 'rgba(0,212,255,0.15)', text: '#00D4FF' },
    'Defaulted': { bg: 'rgba(255,77,77,0.15)', text: '#FF4D4D' },
    'Verified': { bg: 'rgba(0,229,160,0.15)', text: '#00E5A0' },
    'Pending verification': { bg: 'rgba(255,212,0,0.15)', text: '#FFD400' },
  };
  const c = config[status] || config['Pending'];
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] tracking-[0.04em]" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Advances component                                            */
/* ------------------------------------------------------------------ */
export default function Advances() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');

  const advanceAmount = selectedAmount || parseFloat(customAmount) || 0;
  const feePercent = 2.5;
  const fee = advanceAmount * (feePercent / 100);
  const totalRepay = advanceAmount + fee;
  const monthlyIncome = 8200;
  const repaymentPercent = 10;
  const monthlyDeduction = monthlyIncome * (repaymentPercent / 100);
  const payoffMonths = monthlyDeduction > 0 ? Math.ceil(totalRepay / monthlyDeduction) : 0;

  const isEligible = CCS_SCORE >= 500;
  const isNearLimit = USED_ADVANCE / MAX_ADVANCE >= 0.8;

  const filteredHistory = historyFilter === 'All'
    ? ADVANCE_HISTORY
    : ADVANCE_HISTORY.filter((h) => h.status === historyFilter);

  return (
    <div className="space-y-8">
      {/* ── Section 1: Eligibility Banner ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl px-7 py-5 overflow-hidden"
        style={{ borderLeft: `3px solid ${isEligible ? '#00E5A0' : isNearLimit ? '#FFD400' : '#FF4D4D'}` }}
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
                <AlertTriangle size={28} className="text-[#FFD400]" />
              ) : (
                <Lock size={28} className="text-negative" />
              )}
            </motion.div>
            <div>
              <h4 className={`font-body text-[18px] font-semibold ${isEligible ? 'text-positive' : isNearLimit ? 'text-[#FFD400]' : 'text-negative'}`}>
                {isEligible
                  ? `You're approved for advances up to $${MAX_ADVANCE.toLocaleString()}`
                  : isNearLimit
                  ? `You're at ${Math.round((USED_ADVANCE / MAX_ADVANCE) * 100)}% of your advance limit`
                  : 'Advance unavailable — improve your CCS score'}
              </h4>
              <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">
                ${USED_ADVANCE.toLocaleString()} / ${MAX_ADVANCE.toLocaleString()} used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full font-mono text-[12px] tracking-[0.04em] bg-[rgba(0,212,255,0.15)] text-electric">
              CCS: {CCS_SCORE} — {CCS_TIER}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(USED_ADVANCE / MAX_ADVANCE) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="h-full rounded-full"
            style={{ background: isNearLimit ? 'linear-gradient(90deg, #FFD400, #FF4D00)' : 'linear-gradient(90deg, #C8FF00, #00D4FF)' }}
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
          background: 'linear-gradient(135deg, #0F0F1E 0%, rgba(255,77,0,0.04) 100%)',
          border: '1px solid rgba(255,77,0,0.15)',
        }}
      >
        <h2 className="font-display text-[48px] tracking-[0.02em] text-white mb-2">Get an Advance</h2>
        <p className="font-body text-[18px] text-[rgba(255,255,255,0.42)] mb-6">
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
                    : 'bg-transparent text-white border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.06)]'
                }`}
              >
                ${amt.toLocaleString()}
              </motion.button>
            ))}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[20px] text-[rgba(255,255,255,0.4)]">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                placeholder="Custom"
                className="bg-surface border border-[rgba(255,255,255,0.1)] rounded-xl pl-8 pr-4 py-3 font-mono text-[16px] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] outline-none transition-all w-40"
              />
            </div>
          </div>
          <p className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">
            Fee: {feePercent}% (${fee.toFixed(2)}) • Total repayment: ${totalRepay.toFixed(2)} • Est. {payoffMonths} month{payoffMonths !== 1 ? 's' : ''} at {repaymentPercent}% of income
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!isEligible || advanceAmount <= 0 || advanceAmount > MAX_ADVANCE - USED_ADVANCE}
            className="bg-ember text-white font-body text-[16px] font-semibold px-8 py-4 rounded-2xl transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply for ${advanceAmount > 0 ? advanceAmount.toLocaleString() : '...'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Section 3: Active Advances ── */}
      {ACTIVE_ADVANCES.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Active Advances</h3>
          {ACTIVE_ADVANCES.map((advance) => (
            <motion.div
              key={advance.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[14px] text-electric font-medium">{advance.id}</span>
                    <StatusBadge status={advance.status} />
                  </div>
                  <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mt-1">
                    Issued {advance.issued} • {advance.repaymentRate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[24px] font-medium text-white">${advance.amount.toLocaleString()}</p>
                  <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">+${advance.fee} fee ({advance.feePercent}%)</p>
                </div>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${advance.percentRepaid}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="h-full rounded-full bg-gradient-to-r from-acid to-electric"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">${advance.repaid} repaid</span>
                <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">${advance.total} total</span>
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
        className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[rgba(155,93,229,0.15)] flex items-center justify-center">
            <Upload size={20} style={{ color: '#9B5DE5' }} />
          </div>
          <div>
            <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Sponsor-Backed Credit</h3>
            <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
              Upload signed brand deals to increase your advance limit
            </p>
          </div>
        </div>

        {SPONSORSHIP_DEALS.length > 0 ? (
          <div className="space-y-3 mb-6">
            {SPONSORSHIP_DEALS.map((deal) => (
              <div key={deal.brand} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
                <div>
                  <p className="font-body text-[14px] text-white">{deal.brand}</p>
                  <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">${deal.amount.toLocaleString()}</p>
                </div>
                <StatusBadge status={deal.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)]">No deals uploaded yet</p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl border border-dashed border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.42)] hover:text-white hover:border-[rgba(255,255,255,0.4)] transition-all font-body text-[14px]"
        >
          + Upload Signed Contract
        </motion.button>
      </motion.div>

      {/* ── Section 5: Equipment Credit Line ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(0,212,255,0.15)] flex items-center justify-center">
              <ShoppingBag size={20} style={{ color: '#00D4FF' }} />
            </div>
            <div>
              <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Equipment Credit</h3>
              <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
                ${CREDIT_LINE_USED.toLocaleString()} / ${CREDIT_LINE_TOTAL.toLocaleString()} used
              </p>
            </div>
          </div>
          <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)]">
            {Math.round((CREDIT_LINE_USED / CREDIT_LINE_TOTAL) * 100)}%
          </span>
        </div>

        <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-6">
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
                <p className="font-body text-[14px] text-white">{purchase.item}</p>
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">{purchase.date} • ${purchase.amount.toLocaleString()}</p>
              </div>
              <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">{purchase.status}</span>
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
        className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Advance History</h3>
          <div className="flex gap-2">
            {['All', 'Active', 'Repaid'].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-4 py-2 rounded-lg font-mono text-[12px] tracking-[0.04em] transition-all ${
                  historyFilter === f
                    ? 'bg-acid text-void'
                    : 'text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredHistory.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-panel2">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[14px] text-white font-medium">{h.id}</span>
                  <StatusBadge status={h.status} />
                </div>
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">{h.date}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[14px] text-white">${h.amount.toLocaleString()}</p>
                <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)]">${h.repaid} repaid</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
