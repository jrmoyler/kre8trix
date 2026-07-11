import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

/* ── constants ────────────────────────────────────────────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ── revenue data ─────────────────────────────────────────── */
const PLATFORM_REVENUE = [
  { month: 'May', YouTube: 3200, Stripe: 2900, Shopify: 1800, TikTok: 1100, Patreon: 520 },
  { month: 'Jun', YouTube: 3400, Stripe: 3100, Shopify: 1950, TikTok: 950, Patreon: 540 },
  { month: 'Jul', YouTube: 3100, Stripe: 2800, Shopify: 1700, TikTok: 1200, Patreon: 580 },
  { month: 'Aug', YouTube: 3800, Stripe: 3300, Shopify: 2100, TikTok: 1050, Patreon: 620 },
  { month: 'Sep', YouTube: 4480, Stripe: 3280, Shopify: 1770, TikTok: 1100, Patreon: 610 },
  { month: 'Oct', YouTube: 4200, Stripe: 3800, Shopify: 2400, TikTok: 1500, Patreon: 710 },
];

const TIME_RANGES = [
  { label: 'This Month', months: 1 },
  { label: 'Last 3M', months: 3 },
  { label: 'This Year', months: PLATFORM_REVENUE.length },
] as const;

const CURRENT_MONTH = { YouTube: 4200, Stripe: 3800, Shopify: 2400, TikTok: 1500, Patreon: 710 };
const PREV_MONTH = { YouTube: 4480, Stripe: 3280, Shopify: 1770, TikTok: 1100, Patreon: 610 };

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — REVENUE OVERVIEW                              */
/* ═══════════════════════════════════════════════════════════ */
function RevenueOverview({
  range,
  onRangeChange,
}: {
  range: (typeof TIME_RANGES)[number];
  onRangeChange: (range: (typeof TIME_RANGES)[number]) => void;
}) {
  const visibleMonths = PLATFORM_REVENUE.slice(-range.months);
  const sumKey = (key: keyof typeof CURRENT_MONTH) =>
    visibleMonths.reduce((acc, m) => acc + m[key], 0);

  const total = visibleMonths.reduce(
    (acc, m) => acc + m.YouTube + m.Stripe + m.Shopify + m.TikTok + m.Patreon,
    0,
  );
  const prevTotal = Object.values(PREV_MONTH).reduce((a, b) => a + b, 0);
  const change = Math.round(((Object.values(CURRENT_MONTH).reduce((a, b) => a + b, 0) - prevTotal) / prevTotal) * 100);

  const pctChange = (key: keyof typeof CURRENT_MONTH) =>
    Math.round(((CURRENT_MONTH[key] - PREV_MONTH[key]) / PREV_MONTH[key]) * 100);
  const youtubeChange = pctChange('YouTube');
  const stripeChange = pctChange('Stripe');
  const otherPrev = PREV_MONTH.Shopify + PREV_MONTH.TikTok + PREV_MONTH.Patreon;
  const otherCurrent = CURRENT_MONTH.Shopify + CURRENT_MONTH.TikTok + CURRENT_MONTH.Patreon;
  const otherChange = Math.round(((otherCurrent - otherPrev) / otherPrev) * 100);

  const metrics = [
    { label: 'Total Revenue', value: `$${total.toLocaleString()}`, change: `+${change}% vs last month`, positive: true },
    { label: 'YouTube', value: `$${sumKey('YouTube').toLocaleString()}`, change: `${youtubeChange > 0 ? '+' : ''}${youtubeChange}%`, positive: youtubeChange >= 0 },
    { label: 'Stripe', value: `$${sumKey('Stripe').toLocaleString()}`, change: `${stripeChange > 0 ? '+' : ''}${stripeChange}%`, positive: stripeChange >= 0 },
    { label: 'Other', value: `$${(sumKey('Shopify') + sumKey('TikTok') + sumKey('Patreon')).toLocaleString()}`, change: `${otherChange > 0 ? '+' : ''}${otherChange}%`, positive: otherChange >= 0 },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Revenue Overview</h3>
        <div className="flex bg-[rgba(var(--fg-rgb),0.06)] rounded-xl p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => onRangeChange(r)}
              className={`px-4 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${range.label === r.label ? 'bg-acid text-void' : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: easeOutExpo }}
            className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-5 hover:border-[rgba(var(--fg-rgb),0.14)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <p className="font-mono text-[12px] text-[rgba(var(--fg-rgb),var(--muted-alpha))] tracking-[0.04em] mb-2">{m.label}</p>
            <p className="font-mono text-[20px] font-medium text-ink mb-2">{m.value}</p>
            <div className="flex items-center gap-1">
              {m.positive ? (
                <TrendingUp size={12} className="text-positive" />
              ) : (
                <TrendingDown size={12} className="text-negative" />
              )}
              <span className={`font-mono text-[11px] ${m.positive ? 'text-positive' : 'text-negative'}`}>
                {m.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 2 — REVENUE BY PLATFORM (STACKED BAR)             */
/* ═══════════════════════════════════════════════════════════ */
function RevenueByPlatform({ months }: { months: number }) {
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const data = PLATFORM_REVENUE.slice(-months);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(var(--fg-rgb),0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="font-display text-[36px] tracking-[0.02em] text-ink">Revenue by Platform</h3>
        <div className="flex bg-[rgba(var(--fg-rgb),0.06)] rounded-xl p-1">
          {(['stacked', 'grouped'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChartMode(m)}
              className={`px-4 py-2 rounded-lg font-body text-[14px] font-medium capitalize transition-all ${chartMode === m ? 'bg-acid text-void' : 'text-[rgba(var(--fg-rgb),var(--muted-alpha))] hover:text-ink'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(var(--fg-rgb),var(--muted-alpha))', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(var(--fg-rgb),var(--muted-alpha))', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
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
            <Legend
              wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px', paddingTop: '16px' }}
              formatter={(value: string) => <span style={{ color: 'rgba(var(--fg-rgb),var(--muted-alpha))' }}>{value}</span>}
            />
            <Bar dataKey="YouTube" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF0000" radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            <Bar dataKey="Stripe" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#635BFF" radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            <Bar dataKey="Shopify" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#96BF48" radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            <Bar dataKey="TikTok" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF0050" radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            <Bar dataKey="Patreon" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF424D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

export default function Analytics() {
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>(TIME_RANGES[0]);

  return (
    <div className="space-y-8">
      <RevenueOverview range={range} onRangeChange={setRange} />
      <RevenueByPlatform months={range.months} />
    </div>
  );
}
