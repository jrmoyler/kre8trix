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

const CURRENT_MONTH = { YouTube: 4200, Stripe: 3800, Shopify: 2400, TikTok: 1500, Patreon: 710 };
const PREV_MONTH = { YouTube: 4480, Stripe: 3280, Shopify: 1770, TikTok: 1100, Patreon: 610 };

export const PLATFORM_TOTALS = [
  { name: 'YouTube', current: 4200, prev: 4480, change: -6, color: '#FF0000' },
  { name: 'Stripe', current: 3800, prev: 3280, change: 16, color: '#635BFF' },
  { name: 'Shopify', current: 2400, prev: 1770, change: 36, color: '#96BF48' },
  { name: 'TikTok', current: 1500, prev: 1100, change: 36, color: '#FF0050' },
  { name: 'Patreon', current: 710, prev: 610, change: 16, color: '#FF424D' },
];

export const SIX_MONTH_TREND = [
  { month: 'May', revenue: 9520 },
  { month: 'Jun', revenue: 9990 },
  { month: 'Jul', revenue: 9380 },
  { month: 'Aug', revenue: 10870 },
  { month: 'Sep', revenue: 11240 },
  { month: 'Oct', revenue: 12610 },
];

export const TOP_CONTENT = [
  { name: 'Summer Vlog Series #3', platform: 'YouTube', platformColor: '#FF0000', revenue: 1240, views: '2.4M' },
  { name: 'Setup Tour 2024', platform: 'YouTube', platformColor: '#FF0000', revenue: 890, views: '1.8M' },
  { name: 'New Merch Drop', platform: 'Shopify', platformColor: '#96BF48', revenue: 650, views: '340 orders' },
  { name: 'Brand Deal: Lumina', platform: 'Stripe', platformColor: '#635BFF', revenue: 580, views: 'Sponsored' },
  { name: 'Tutorial Series', platform: 'TikTok', platformColor: '#FF0050', revenue: 420, views: '1.2M' },
];

export const PAYOUTS = [
  { platform: 'YouTube', date: 'Oct 22', amount: 4850, color: '#FF0000' },
  { platform: 'Shopify', date: 'Oct 25', amount: 2180, color: '#96BF48' },
  { platform: 'Patreon', date: 'Oct 28', amount: 890, color: '#FF424D' },
  { platform: 'Stripe', date: 'Nov 3', amount: 3450, color: '#635BFF' },
  { platform: 'TikTok', date: 'Nov 10', amount: 1240, color: '#FF0050' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION 1 — REVENUE OVERVIEW                              */
/* ═══════════════════════════════════════════════════════════ */
function RevenueOverview() {
  const total = Object.values(CURRENT_MONTH).reduce((a, b) => a + b, 0);
  const prevTotal = Object.values(PREV_MONTH).reduce((a, b) => a + b, 0);
  const change = Math.round(((total - prevTotal) / prevTotal) * 100);

  const metrics = [
    { label: 'Total Revenue', value: `$${total.toLocaleString()}`, change: `+${change}% vs last month`, positive: true },
    { label: 'YouTube', value: `$${CURRENT_MONTH.YouTube.toLocaleString()}`, change: '-6%', positive: false },
    { label: 'Stripe', value: `$${CURRENT_MONTH.Stripe.toLocaleString()}`, change: '+16%', positive: true },
    { label: 'Other', value: `$${(CURRENT_MONTH.Shopify + CURRENT_MONTH.TikTok + CURRENT_MONTH.Patreon).toLocaleString()}`, change: '+31%', positive: true },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Revenue Overview</h3>
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1">
          {['This Month', 'Last 3M', 'This Year'].map((r, i) => (
            <button
              key={r}
              className={`px-4 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${i === 0 ? 'bg-acid text-void' : 'text-[rgba(255,255,255,0.42)] hover:text-white'}`}
            >
              {r}
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
            className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.14)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <p className="font-mono text-[12px] text-[rgba(255,255,255,0.42)] tracking-[0.04em] mb-2">{m.label}</p>
            <p className="font-mono text-[20px] font-medium text-white mb-2">{m.value}</p>
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
function RevenueByPlatform() {
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="bg-panel border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="font-display text-[36px] tracking-[0.02em] text-white">Revenue by Platform</h3>
        <div className="flex bg-[rgba(255,255,255,0.06)] rounded-xl p-1">
          {(['stacked', 'grouped'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChartMode(m)}
              className={`px-4 py-2 rounded-lg font-body text-[14px] font-medium capitalize transition-all ${chartMode === m ? 'bg-acid text-void' : 'text-[rgba(255,255,255,0.42)] hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PLATFORM_REVENUE}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
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
            <Legend
              wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px', paddingTop: '16px' }}
              formatter={(value: string) => <span style={{ color: 'rgba(255,255,255,0.42)' }}>{value}</span>}
            />
            <Bar dataKey="YouTube" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF0000" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Stripe" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#635BFF" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Shopify" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#96BF48" radius={[0, 0, 0, 0]} />
            <Bar dataKey="TikTok" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF0050" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Patreon" stackId={chartMode === 'stacked' ? 'a' : undefined} fill="#FF424D" radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

export default function Analytics() {
  return (
    <div className="space-y-8">
      <RevenueOverview />
      <RevenueByPlatform />
    </div>
  );
}
