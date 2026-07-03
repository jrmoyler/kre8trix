import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Zap,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchDashboardSummary,
  fetchDashboardTransactions,
  fetchPlatformRevenue,
  fetchCashFlow,
} from '@/lib/api/dashboard';
import type {
  DashboardSummary,
  DashboardTransaction,
  DashboardCCS,
  PlatformRevenueSummary,
  PlatformRevenueItem,
  CashFlowPoint,
} from '@/lib/api/dashboard';
import type { ForecastRange } from '@/lib/api/types';

/* ─────────────────────────── animations ─────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ─────────────────────────── count-up hook ─────────────────────────── */

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTime.current === null) startTime.current = timestamp;
        const elapsed = timestamp - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) {
          rafId.current = requestAnimationFrame(animate);
        }
      };
      rafId.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration, delay]);

  return value;
}

/* ─────────────────────────── components ─────────────────────────── */

/* Alert Banner */
function AlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.1 }}
          className="w-full rounded-2xl px-6 py-4 flex items-center justify-between gap-4 mb-6"
          style={{
            background: 'linear-gradient(90deg, rgba(200,255,0,0.06), rgba(0,212,255,0.06))',
            border: '1px solid rgba(200,255,0,0.15)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="relative flex h-4 w-4 flex-shrink-0">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-acid opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-acid" />
            </span>
            <p className="font-body text-[14px] text-[#E8E8F0] truncate">
              Your October looks tight. Platform payouts delayed 5 days. Consider an advance.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/cash-flow')}
              className="text-[14px] font-medium text-electric hover:text-acid transition-colors duration-200 whitespace-nowrap"
            >
              View Details
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-[rgba(255,255,255,0.42)] hover:text-white transition-colors duration-150"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Balance Card */
function BalanceCard({
  label,
  balance,
  change,
  changeLabel,
  prefix = '$',
  suffix = '',
  delay = 0,
  accentColor,
  gradientBg,
  borderColor,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  balance: number;
  change: string;
  changeLabel: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  accentColor: string;
  gradientBg: string;
  borderColor: string;
  sparklineData: number[];
  sparklineColor: string;
}) {
  const count = useCountUp(balance, 1200, delay);

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl p-6 relative overflow-hidden group cursor-default"
      style={{
        background: gradientBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(255,255,255,0.42)] uppercase">
              {label}
            </span>
          </div>
          <div className="font-mono text-[36px] font-medium text-white tracking-[-0.02em] leading-none mb-2">
            {prefix}{count.toLocaleString()}{suffix}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[12px] tracking-[0.04em]"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              {change}
            </span>
            <span className="font-body text-[12px] text-[rgba(255,255,255,0.42)]">{changeLabel}</span>
          </div>
        </div>
        <div className="w-[120px] h-[50px] flex-shrink-0">
          <svg viewBox="0 0 120 50" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`sparkGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={sparklineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M0,${50 - (sparklineData[0] / Math.max(...sparklineData)) * 45} ${sparklineData.map((v, i) => `L${(i / (sparklineData.length - 1)) * 120},${50 - (v / Math.max(...sparklineData)) * 45}`).join(' ')} L120,50 L0,50 Z`}
              fill={`url(#sparkGrad-${label})`}
            />
            <path
              d={`M0,${50 - (sparklineData[0] / Math.max(...sparklineData)) * 45} ${sparklineData.map((v, i) => `L${(i / (sparklineData.length - 1)) * 120},${50 - (v / Math.max(...sparklineData)) * 45}`).join(' ')}`}
              fill="none"
              stroke={sparklineColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

/* CCS Score Card */
function CCSScoreCard({ ccs }: { ccs: DashboardCCS }) {
  const navigate = useNavigate();
  const targetScore = ccs.score;
  const maxScore = ccs.maxScore;
  const count = useCountUp(targetScore, 1500, 600);
  const circumference = 2 * Math.PI * 90;
  const progress = count / maxScore;
  const dashOffset = circumference * (1 - progress);

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl p-8 bg-panel border border-[rgba(255,255,255,0.08)] flex flex-col items-center"
    >
      <div className="flex items-center gap-2 mb-6 self-start">
        <h3 className="font-display text-[28px] tracking-[0.02em] text-white">
          Creator Credit Score
        </h3>
        <Info size={16} className="text-[rgba(255,255,255,0.42)]" />
      </div>

      <div className="relative mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C8FF00" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
          />
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.6 }}
            style={{ filter: 'drop-shadow(0 0 24px rgba(200,255,0,0.15))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[48px] font-medium text-white tracking-[-0.02em] leading-none">
            {count}
          </span>
          <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mt-1">
            out of {maxScore}
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.4 }}
        className="flex flex-col items-center gap-2"
      >
        <span
          className="inline-flex items-center px-4 py-1.5 rounded-full font-mono text-[12px] tracking-[0.04em] font-medium"
          style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}
        >
          {ccs.tier.toUpperCase()}
        </span>
        <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
          {ccs.percentile}
        </span>
      </motion.div>

      <button
        onClick={() => navigate('/credit-score')}
        className="mt-4 text-[14px] font-medium text-electric hover:text-acid transition-colors duration-200 flex items-center gap-1"
      >
        View Full Breakdown
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

/* Quick Action Button */
function QuickActionButton({
  icon: Icon,
  label,
  description,
  color,
  delay,
  onClick,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  description: string;
  color: string;
  delay: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2, borderColor: `${color}40` }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center gap-4 bg-panel2 border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 w-full text-left hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ background: `${color}15` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[16px] font-semibold text-white truncate">{label}</p>
        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] truncate">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

/* Transaction Row */
function TransactionRow({
  tx,
  index,
  onClick,
}: {
  tx: DashboardTransaction;
  index: number;
  onClick: () => void;
}) {
  const isPositive = tx.amount > 0;
  const statusColors: Record<string, string> = {
    completed: '#00E5A0',
    pending: '#FFD400',
    failed: '#FF4D4D',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
        delay: 1.2 + index * 0.06,
      }}
      onClick={onClick}
      className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-panel2 transition-colors duration-150 cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${tx.iconColor}15` }}
      >
        <span className="text-[12px] font-bold" style={{ color: tx.iconColor }}>
          {tx.platform[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[14px] text-white truncate">{tx.name}</p>
        <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] truncate">
          {tx.platform}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className="font-mono text-[14px] font-medium tracking-[-0.02em]"
          style={{ color: isPositive ? '#00E5A0' : '#FF4D4D' }}
        >
          {isPositive ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}.00
        </p>
        <div className="flex items-center justify-end gap-2 mt-0.5">
          <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
            {tx.date}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: statusColors[tx.status] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* Platform Revenue Bar */
function PlatformRevenueBar({
  item,
  index,
  maxAmount,
}: {
  item: PlatformRevenueItem;
  index: number;
  maxAmount: number;
}) {
  const widthPercent = (item.amount / maxAmount) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[12px] text-white tracking-[0.04em] w-[70px] flex-shrink-0 text-right">
        {item.platform}
      </span>
      <div className="flex-1 h-8 bg-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            delay: 1.4 + index * 0.08,
          }}
          className="h-full rounded-lg"
          style={{ background: item.color, opacity: 0.7 }}
        />
      </div>
      <span className="font-mono text-[14px] text-white tracking-[-0.02em] w-[70px] flex-shrink-0">
        ${item.amount.toLocaleString()}
      </span>
    </div>
  );
}

/* ─────────────────────────── loading / error ─────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="animate-pulse bg-surface rounded-2xl h-[58px]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="animate-pulse bg-surface rounded-2xl h-[152px]" />
          <div className="animate-pulse bg-surface rounded-2xl h-[152px]" />
        </div>
        <div className="lg:col-span-4">
          <div className="animate-pulse bg-surface rounded-2xl h-full min-h-[320px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-surface rounded-2xl h-[88px]" />
        ))}
      </div>
      <div className="animate-pulse bg-surface rounded-2xl h-[470px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse bg-surface rounded-2xl h-[420px]" />
        <div className="animate-pulse bg-surface rounded-2xl h-[420px]" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-panel border border-[rgba(255,77,0,0.25)] rounded-2xl p-12 flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,77,0,0.12)' }}>
        <Info size={22} className="text-ember" />
      </div>
      <div>
        <p className="font-display text-[28px] tracking-[0.02em] text-white">
          Couldn't load your dashboard
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [forecastTab, setForecastTab] = useState<ForecastRange>('30D');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<DashboardTransaction[] | null>(null);
  const [platformRevenue, setPlatformRevenue] = useState<PlatformRevenueSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  const [cashFlowData, setCashFlowData] = useState<CashFlowPoint[] | null>(null);
  const [cashFlowError, setCashFlowError] = useState<string | null>(null);
  const [cashFlowKey, setCashFlowKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    Promise.all([fetchDashboardSummary(), fetchDashboardTransactions(), fetchPlatformRevenue()])
      .then(([summaryRes, txRes, revenueRes]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setTransactions(txRes);
        setPlatformRevenue(revenueRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  useEffect(() => {
    let cancelled = false;
    setCashFlowError(null);
    fetchCashFlow(forecastTab)
      .then((points) => {
        if (!cancelled) setCashFlowData(points);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCashFlowError(err instanceof Error ? err.message : 'Failed to load forecast.');
      });
    return () => {
      cancelled = true;
    };
  }, [forecastTab, cashFlowKey]);

  const quickActions = [
    { icon: ArrowUpRight, label: 'Send Money', description: 'Transfer funds instantly', color: '#C8FF00', path: '/wallet?action=send' },
    { icon: ArrowDownLeft, label: 'Request', description: 'Request payment from anyone', color: '#00D4FF', path: '/wallet?action=request' },
    { icon: RefreshCw, label: 'Convert', description: 'USD to USDC & back', color: '#9B5DE5', path: '/wallet?action=convert' },
    { icon: Zap, label: 'Get Advance', description: 'Revenue-backed financing', color: '#FF4D00', path: '/advances' },
  ];

  const forecastPills: Record<string, { label: string; amount: string; color: string }> = {
    '30D': { label: '30-Day', amount: '$28,600', color: '#00D4FF' },
    '60D': { label: '60-Day', amount: '$41,200', color: '#C8FF00' },
    '90D': { label: '90-Day', amount: '$51,600', color: '#9B5DE5' },
  };

  if (loadError) {
    return <DashboardError message={loadError} onRetry={() => setLoadKey((k) => k + 1)} />;
  }

  if (!summary || !transactions || !platformRevenue) {
    return <DashboardSkeleton />;
  }

  const usdBalance = summary.balances.find((b) => b.currency === 'USD');
  const usdcBalance = summary.balances.find((b) => b.currency === 'USDC');
  const totalRevenue = platformRevenue.platforms.reduce((sum, p) => sum + p.amount, 0);
  const maxRevenue = Math.max(...platformRevenue.platforms.map((p) => p.amount));

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Section 1: Alert Banner */}
      <AlertBanner />

      {/* Sections 2+3: Balance Cards + CCS Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Balance Cards - 8fr */}
        <div className="lg:col-span-8 space-y-4">
          {usdBalance && (
            <BalanceCard
              label="USD Balance"
              balance={usdBalance.amount}
              change={usdBalance.change}
              changeLabel={usdBalance.changeLabel}
              delay={300}
              accentColor="#00E5A0"
              gradientBg="linear-gradient(135deg, #0F0F1E 0%, rgba(200,255,0,0.03) 100%)"
              borderColor="rgba(200,255,0,0.12)"
              sparklineData={usdBalance.sparkline}
              sparklineColor="#00D4FF"
            />
          )}
          {usdcBalance && (
            <BalanceCard
              label="USDC Balance"
              balance={usdcBalance.amount}
              change={usdcBalance.change}
              changeLabel={usdcBalance.changeLabel}
              prefix=""
              suffix=" USDC"
              delay={450}
              accentColor="#00E5A0"
              gradientBg="linear-gradient(135deg, #0F0F1E 0%, rgba(155,93,229,0.03) 100%)"
              borderColor="rgba(155,93,229,0.12)"
              sparklineData={usdcBalance.sparkline}
              sparklineColor="#9B5DE5"
            />
          )}
        </div>

        {/* CCS Score - 4fr */}
        <div className="lg:col-span-4">
          <CCSScoreCard ccs={summary.ccs} />
        </div>
      </div>

      {/* Section 4: Quick Actions */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickActions.map((action, i) => (
          <QuickActionButton
            key={action.label}
            icon={action.icon}
            label={action.label}
            description={action.description}
            color={action.color}
            delay={800 + i * 80}
            onClick={() => navigate(action.path)}
          />
        ))}
      </motion.div>

      {/* Section 5: Cash Flow Forecast */}
      <motion.div
        variants={itemVariants}
        className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-white">
            Cash Flow Forecast
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex bg-panel2 rounded-xl p-1">
              {(['30D', '60D', '90D'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setForecastTab(tab)}
                  className={`
                    px-4 py-2 rounded-lg font-mono text-[12px] tracking-[0.04em] transition-all duration-200
                    ${forecastTab === tab
                      ? 'bg-panel text-white shadow-sm'
                      : 'text-[rgba(255,255,255,0.42)] hover:text-white'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/cash-flow')}
              className="text-[14px] font-medium text-electric hover:text-acid transition-colors duration-200 flex items-center gap-1"
            >
              View Full Report
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="h-[350px]">
          {cashFlowError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <p className="font-body text-[14px] text-[rgba(255,255,255,0.42)]">{cashFlowError}</p>
              <button
                onClick={() => setCashFlowKey((k) => k + 1)}
                className="px-5 py-2 rounded-xl bg-acid text-black font-body text-[14px] font-semibold hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          ) : cashFlowData === null ? (
            <div className="h-full animate-pulse bg-surface rounded-xl" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8FF00" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#C8FF00" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.42)', fontFamily: '"JetBrains Mono", monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.42)', fontFamily: '"JetBrains Mono", monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#0F0F1E',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  color: '#E8E8F0',
                }}
                formatter={(value: number) => [`$${value?.toLocaleString()}`, '']}
              />
              <Area
                type="monotone"
                dataKey="historical"
                stroke="#C8FF00"
                strokeWidth={2}
                fill="url(#historicalGrad)"
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, fill: '#C8FF00' }}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="#00D4FF"
                strokeWidth={2}
                strokeDasharray="6 4"
                fill="url(#projectedGrad)"
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, fill: '#00D4FF' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center gap-6 mt-4">
          {Object.values(forecastPills).map((pill) => (
            <div key={pill.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: pill.color }} />
              <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
                {pill.label}:
              </span>
              <span className="font-mono text-[20px] font-medium text-white tracking-[-0.02em]">
                {pill.amount}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sections 6+7: Transactions + Platform Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div
          variants={itemVariants}
          className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display text-[28px] tracking-[0.02em] text-white">
              Recent Transactions
            </h4>
            <button
              onClick={() => navigate('/wallet')}
              className="text-[14px] font-medium text-electric hover:text-acid transition-colors duration-200 flex items-center gap-1"
            >
              View All
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {transactions.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                index={i}
                onClick={() => navigate('/wallet?action=history')}
              />
            ))}
          </div>
        </motion.div>

        {/* Platform Revenue */}
        <motion.div
          variants={itemVariants}
          className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-display text-[28px] tracking-[0.02em] text-white">
              Revenue by Platform
            </h4>
          </div>
          <div className="space-y-4">
            {platformRevenue.platforms.map((item, i) => (
              <PlatformRevenueBar
                key={item.platform}
                item={item}
                index={i}
                maxAmount={maxRevenue}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <div>
              <span className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em]">
                Total Monthly
              </span>
              <p className="font-mono text-[20px] font-medium tracking-[-0.02em]" style={{ color: '#C8FF00' }}>
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
            <span className="font-mono text-[12px] tracking-[0.04em]" style={{ color: '#00E5A0' }}>
              {platformRevenue.changeLabel}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
