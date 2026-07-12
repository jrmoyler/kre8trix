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
import { useApi } from '@/hooks/use-api';
import type {
  CashFlowForecast,
  CcsScore,
  ForecastWindow,
  PlatformRevenue,
  PlatformRevenueSummary,
  WalletBalances,
  WalletTransaction,
} from '@/lib/types';
import {
  BalanceCardSkeleton,
  BarListSkeleton,
  ChartSkeleton,
  ErrorNotice,
  ScoreCardSkeleton,
  TransactionListSkeleton,
} from '@/components/Skeletons';

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

function useCountUp(target: number, duration = 1200, delay = 0, round = true) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTime.current === null) startTime.current = timestamp;
        const elapsed = timestamp - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(round ? Math.round(eased * target) : eased * target);
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
  }, [target, duration, delay, round]);

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
            background: 'linear-gradient(90deg, rgba(var(--acid-rgb),0.06), rgba(var(--electric-rgb),0.06))',
            border: '1px solid rgba(var(--acid-rgb),0.15)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="relative flex h-4 w-4 flex-shrink-0">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-acid opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-acid" />
            </span>
            <p className="font-body text-[14px] text-[rgb(var(--color-ink))] truncate">
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
              aria-label="Dismiss"
              className="text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink transition-colors duration-150"
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
  const count = useCountUp(balance, 1200, delay, false);

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
            <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),var(--muted-alpha))] uppercase">
              {label}
            </span>
          </div>
          <div className="font-mono text-[36px] font-medium text-ink tracking-[-0.02em] leading-none mb-2">
            {prefix}{count.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[12px] tracking-[0.04em]"
              style={{ background: `color-mix(in srgb, ${accentColor} 13%, transparent)`, color: accentColor }}
            >
              {change}
            </span>
            <span className="font-body text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))]">{changeLabel}</span>
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
function CCSScoreCard({ score }: { score: CcsScore }) {
  const navigate = useNavigate();
  const count = useCountUp(score.score, 1500, 600);
  const circumference = 2 * Math.PI * 90;
  const progress = count / score.maxScore;
  const dashOffset = circumference * (1 - progress);

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl p-8 bg-panel border border-[rgba(var(--fg-rgb),0.08)] flex flex-col items-center"
    >
      <div className="flex items-center gap-2 mb-6 self-start">
        <h3 className="font-display text-[28px] tracking-[0.02em] text-ink">
          Creator Credit Score
        </h3>
        <Info size={16} className="text-[rgba(var(--fg-rgb),var(--muted-alpha))]" />
      </div>

      <div className="relative mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(var(--color-acid))" />
              <stop offset="100%" stopColor="rgb(var(--color-electric))" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(var(--fg-rgb),0.08)"
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
            style={{ filter: 'drop-shadow(0 0 24px rgba(var(--acid-rgb),0.15))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[48px] font-medium text-ink tracking-[-0.02em] leading-none">
            {count}
          </span>
          <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mt-1">
            out of {score.maxScore}
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
          style={{ background: 'rgba(var(--electric-rgb),0.15)', color: 'rgb(var(--color-electric))' }}
        >
          {score.tier.toUpperCase()}
        </span>
        <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
          Top {score.percentile}% of creators
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
      whileHover={{ y: -2, borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center gap-4 bg-panel2 border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-5 w-full text-left hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ background: `color-mix(in srgb, ${color} 9%, transparent)` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[16px] font-semibold text-ink truncate">{label}</p>
        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] truncate">
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
}: {
  tx: WalletTransaction;
  index: number;
}) {
  const isPositive = tx.amount >= 0;
  const statusColors: Record<string, string> = {
    Completed: 'rgb(var(--color-positive))',
    Pending: 'rgb(var(--color-gold))',
    Failed: 'rgb(var(--color-negative))',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
        delay: index * 0.06,
      }}
      className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-panel2 transition-colors duration-150 cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${tx.iconColor} 9%, transparent)` }}
      >
        <span className="text-[12px] font-bold" style={{ color: tx.iconColor }}>
          {tx.platform[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[14px] text-ink truncate">{tx.description}</p>
        <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] truncate">
          {tx.platform}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className="font-mono text-[14px] font-medium tracking-[-0.02em]"
          style={{ color: isPositive ? 'rgb(var(--color-positive))' : 'rgb(var(--color-negative))' }}
        >
          {isPositive ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-end gap-2 mt-0.5">
          <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
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
  item: PlatformRevenue;
  index: number;
  maxAmount: number;
}) {
  const widthPercent = (item.amount / maxAmount) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[12px] text-ink tracking-[0.04em] w-[70px] flex-shrink-0 text-right">
        {item.platform}
      </span>
      <div className="flex-1 h-8 bg-[rgba(var(--fg-rgb),0.04)] rounded-lg overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            delay: index * 0.08,
          }}
          className="h-full rounded-lg"
          style={{ background: item.color, opacity: 0.7 }}
        />
      </div>
      <span className="font-mono text-[14px] text-ink tracking-[-0.02em] w-[70px] flex-shrink-0">
        ${item.amount.toLocaleString()}
      </span>
    </div>
  );
}

/* ─────────────────────────── main page ─────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [forecastTab, setForecastTab] = useState<ForecastWindow>('30D');

  const balancesQuery = useApi<WalletBalances>('/wallet/balances');
  const transactionsQuery = useApi<WalletTransaction[]>('/wallet/transactions?limit=8');
  const revenueQuery = useApi<PlatformRevenueSummary>('/revenue/platforms');
  const scoreQuery = useApi<CcsScore>('/ccs/score');
  const forecastQuery = useApi<CashFlowForecast>(`/cashflow/forecast?window=${forecastTab}`);

  const quickActions = [
    { icon: ArrowUpRight, label: 'Send Money', description: 'Transfer funds instantly', color: 'rgb(var(--color-acid))', path: '/wallet?action=send' },
    { icon: ArrowDownLeft, label: 'Request', description: 'Request payment from anyone', color: 'rgb(var(--color-electric))', path: '/wallet?action=request' },
    { icon: RefreshCw, label: 'Move Money', description: 'Between your balances', color: 'rgb(var(--color-violet))', path: '/wallet?action=convert' },
    { icon: Zap, label: 'Get Advance', description: 'Revenue-backed financing', color: 'rgb(var(--color-ember))', path: '/advances' },
  ];

  const balances = balancesQuery.data;
  const revenue = revenueQuery.data;
  const maxRevenue = revenue ? Math.max(...revenue.platforms.map((p) => p.amount)) : 0;
  const forecast = forecastQuery.data;

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
          {balancesQuery.loading || !balances ? (
            <>
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
            </>
          ) : (
            <>
              <BalanceCard
                label="Cash Balance"
                balance={balances.usd}
                change="+$1,240"
                changeLabel="this month"
                delay={300}
                accentColor="rgb(var(--color-positive))"
                gradientBg="linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--acid-rgb),0.03) 100%)"
                borderColor="rgba(var(--acid-rgb),0.12)"
                sparklineData={balances.usdSparkline}
                sparklineColor="rgb(var(--color-electric))"
              />
              <BalanceCard
                label="Instant Balance"
                balance={balances.usdc}
                change="+$850"
                changeLabel="this week"
                delay={450}
                accentColor="rgb(var(--color-positive))"
                gradientBg="linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgba(var(--violet-rgb),0.03) 100%)"
                borderColor="rgba(var(--violet-rgb),0.12)"
                sparklineData={balances.usdcSparkline}
                sparklineColor="rgb(var(--color-violet))"
              />
            </>
          )}
        </div>

        {/* CCS Score - 4fr */}
        <div className="lg:col-span-4">
          {scoreQuery.loading || !scoreQuery.data ? (
            <ScoreCardSkeleton />
          ) : (
            <CCSScoreCard score={scoreQuery.data} />
          )}
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
        className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">
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
                      ? 'bg-panel text-ink shadow-sm'
                      : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'
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

        {forecastQuery.error ? (
          <ErrorNotice message={forecastQuery.error} onRetry={forecastQuery.refresh} />
        ) : forecastQuery.loading || !forecast ? (
          <ChartSkeleton height={350} />
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--color-acid))" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(var(--color-acid))" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--color-electric))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="rgb(var(--color-electric))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'rgba(var(--fg-rgb),var(--muted-alpha))', fontFamily: '"JetBrains Mono", monospace' }}
                  axisLine={{ stroke: 'rgba(var(--fg-rgb),0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'rgba(var(--fg-rgb),var(--muted-alpha))', fontFamily: '"JetBrains Mono", monospace' }}
                  axisLine={{ stroke: 'rgba(var(--fg-rgb),0.08)' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--color-panel))',
                    border: '1px solid rgba(var(--fg-rgb),0.08)',
                    borderRadius: '12px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '12px',
                    color: 'rgb(var(--color-ink))',
                  }}
                  formatter={(value: number) => [`$${value?.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="rgb(var(--color-acid))"
                  strokeWidth={2}
                  fill="url(#historicalGrad)"
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 4, fill: 'rgb(var(--color-acid))' }}
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke="rgb(var(--color-electric))"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="url(#projectedGrad)"
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 4, fill: 'rgb(var(--color-electric))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center gap-6 mt-4">
          {(forecast?.summary ?? []).map((pill) => (
            <button
              key={pill.window}
              onClick={() => setForecastTab(pill.window)}
              className="flex items-center gap-2"
            >
              {/* D4: dimming lives on the decorative dot only — the label and
                  amount keep their own always-readable colors below, rather
                  than being multiplied by a blanket container opacity (which
                  otherwise halved already-tuned muted-text contrast to <4.5:1). */}
              <span
                className={`w-2.5 h-2.5 rounded-full transition-opacity ${forecastTab === pill.window ? '' : 'opacity-50'}`}
                style={{ background: pill.color }}
              />
              <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
                {pill.label}:
              </span>
              <span
                className={`font-mono text-[20px] font-medium tracking-[-0.02em] transition-colors ${
                  forecastTab === pill.window ? 'text-ink' : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'
                }`}
              >
                ${pill.amount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Sections 6+7: Transactions + Platform Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div
          variants={itemVariants}
          className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display text-[28px] tracking-[0.02em] text-ink">
              Recent Transactions
            </h4>
            <button
              onClick={() => navigate('/wallet?action=history')}
              className="text-[14px] font-medium text-electric hover:text-acid transition-colors duration-200 flex items-center gap-1"
            >
              View All
              <ChevronRight size={14} />
            </button>
          </div>
          {transactionsQuery.error ? (
            <ErrorNotice message={transactionsQuery.error} onRetry={transactionsQuery.refresh} />
          ) : transactionsQuery.loading || !transactionsQuery.data ? (
            <TransactionListSkeleton rows={8} />
          ) : (
            <div className="divide-y divide-[rgba(var(--fg-rgb),0.04)]">
              {transactionsQuery.data.map((tx, i) => (
                <TransactionRow key={tx.id} tx={tx} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Platform Revenue */}
        <motion.div
          variants={itemVariants}
          className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-display text-[28px] tracking-[0.02em] text-ink">
              Revenue by Platform
            </h4>
          </div>
          {revenueQuery.error ? (
            <ErrorNotice message={revenueQuery.error} onRetry={revenueQuery.refresh} />
          ) : revenueQuery.loading || !revenue ? (
            <BarListSkeleton rows={5} />
          ) : (
            <>
              <div className="space-y-4">
                {revenue.platforms.map((item, i) => (
                  <PlatformRevenueBar
                    key={item.platform}
                    item={item}
                    index={i}
                    maxAmount={maxRevenue}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(var(--fg-rgb),0.08)]">
                <div>
                  <span className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em]">
                    Total Monthly
                  </span>
                  <p className="font-mono text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'rgb(var(--color-acid))' }}>
                    ${revenue.total.toLocaleString()}
                  </p>
                </div>
                <span
                  className="font-mono text-[12px] tracking-[0.04em]"
                  style={{ color: revenue.changePercent >= 0 ? 'rgb(var(--color-positive))' : 'rgb(var(--color-negative))' }}
                >
                  {revenue.changePercent >= 0 ? '+' : ''}{revenue.changePercent}% vs last month
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
