/**
 * Dashboard domain module.
 *
 * Typed API functions for the main dashboard page plus the mock handlers
 * that serve its data when `VITE_API_URL` is unset. Registering the handlers
 * happens as a side effect of importing this module (see
 * src/lib/mock/registry.ts for the pattern), so pages only need to import
 * the fetch functions below.
 */
import { get } from '../api';
import { registerMockHandler } from '../mock/registry';
import type { CCSTierName, Currency, ForecastRange } from './types';

/* ── Types ──────────────────────────────────────────────────────────── */

/** A wallet balance as shown on a dashboard balance card. */
export interface DashboardBalance {
  currency: Currency;
  /** Available amount in the currency's units, e.g. 24850. */
  amount: number;
  /** Change pill label, e.g. '+$1,240' or '+850 USDC'. */
  change: string;
  /** Change period label, e.g. 'this month'. */
  changeLabel: string;
  /** Recent balance history for the sparkline (oldest first). */
  sparkline: number[];
}

/** Condensed Creator Credit Score shown on the dashboard. */
export interface DashboardCCS {
  /** Current score, e.g. 612. */
  score: number;
  /** Scale maximum, e.g. 850. */
  maxScore: number;
  tier: CCSTierName;
  /** Standing label, e.g. 'Top 34% of creators'. */
  percentile: string;
}

/** Payload of GET /dashboard/summary — balances and monthly change. */
export interface DashboardSummary {
  balances: DashboardBalance[];
  ccs: DashboardCCS;
}

export type DashboardTransactionStatus = 'completed' | 'pending' | 'failed';

/** A recent-activity row on the dashboard. */
export interface DashboardTransaction {
  id: number;
  /** e.g. 'YouTube Ad Revenue'. */
  name: string;
  /** Source platform, e.g. 'YouTube', 'Kre8trix Card'. */
  platform: string;
  /** Signed amount: positive = inflow, negative = outflow. */
  amount: number;
  /** Short date label, e.g. 'Oct 15'. */
  date: string;
  status: DashboardTransactionStatus;
  /** Hex brand color for the platform icon, e.g. '#FF0000'. */
  iconColor: string;
}

/** One platform's revenue in the "Revenue by Platform" panel. */
export interface PlatformRevenueItem {
  platform: string;
  /** Monthly revenue in USD. */
  amount: number;
  /** Hex brand color for the bar, e.g. '#FF0000'. */
  color: string;
}

/** Payload of GET /dashboard/platform-revenue. */
export interface PlatformRevenueSummary {
  platforms: PlatformRevenueItem[];
  /** Month-over-month label, e.g. '+12% vs last month'. */
  changeLabel: string;
}

/**
 * One point on the dashboard cash-flow chart. Historical points set
 * `historical`; projected points set `projected`.
 */
export interface CashFlowPoint {
  /** X-axis label, e.g. 'Oct 15'. */
  date: string;
  /** Offset in days from today. Negative = historical, positive = projected. */
  day: number;
  historical: number | null;
  projected: number | null;
}

/* ── Mock data ──────────────────────────────────────────────────────── */

const MOCK_SUMMARY: DashboardSummary = {
  balances: [
    {
      currency: 'USD',
      amount: 24850,
      change: '+$1,240',
      changeLabel: 'this month',
      sparkline: [8200, 9400, 11200, 10800, 13100, 14500, 15200, 16800, 18400],
    },
    {
      currency: 'USDC',
      amount: 12450,
      change: '+850 USDC',
      changeLabel: 'this week',
      sparkline: [4200, 5100, 5800, 6200, 7400, 8900, 10200, 11500, 12450],
    },
  ],
  ccs: {
    score: 612,
    maxScore: 850,
    tier: 'Rising',
    percentile: 'Top 34% of creators',
  },
};

const MOCK_TRANSACTIONS: DashboardTransaction[] = [
  { id: 1, name: 'YouTube Ad Revenue', platform: 'YouTube', amount: 4850, date: 'Oct 15', status: 'completed', iconColor: '#FF0000' },
  { id: 2, name: 'TikTok Creator Fund', platform: 'TikTok', amount: 1240, date: 'Oct 14', status: 'completed', iconColor: '#FF0050' },
  { id: 3, name: 'Shopify Store Sales', platform: 'Shopify', amount: 2180, date: 'Oct 13', status: 'completed', iconColor: '#96BF48' },
  { id: 4, name: 'USDC to USD Conversion', platform: 'Kre8trix', amount: -500, date: 'Oct 12', status: 'completed', iconColor: '#C8FF00' },
  { id: 5, name: 'Equipment Purchase', platform: 'Kre8trix Card', amount: -1299, date: 'Oct 11', status: 'completed', iconColor: '#9B5DE5' },
  { id: 6, name: 'Stripe Payout', platform: 'Stripe', amount: 3450, date: 'Oct 10', status: 'pending', iconColor: '#635BFF' },
  { id: 7, name: 'Advance Repayment', platform: 'Kre8trix', amount: -1850, date: 'Oct 9', status: 'completed', iconColor: '#C8FF00' },
  { id: 8, name: 'Patreon Subscriptions', platform: 'Patreon', amount: 890, date: 'Oct 8', status: 'completed', iconColor: '#FF424D' },
];

const MOCK_PLATFORM_REVENUE: PlatformRevenueSummary = {
  platforms: [
    { platform: 'YouTube', amount: 4850, color: '#FF0000' },
    { platform: 'Stripe', amount: 3450, color: '#635BFF' },
    { platform: 'Shopify', amount: 2180, color: '#96BF48' },
    { platform: 'TikTok', amount: 1240, color: '#FF0050' },
    { platform: 'Patreon', amount: 890, color: '#FF424D' },
  ],
  changeLabel: '+12% vs last month',
};

/* `day` = offset in days from today (Oct 10). Negative = historical, positive = projected. */
const MOCK_CASH_FLOW: CashFlowPoint[] = [
  { date: 'Sep 1', day: -40, historical: 8200, projected: null },
  { date: 'Sep 5', day: -35, historical: 9400, projected: null },
  { date: 'Sep 10', day: -30, historical: 11200, projected: null },
  { date: 'Sep 15', day: -25, historical: 10800, projected: null },
  { date: 'Sep 20', day: -20, historical: 13100, projected: null },
  { date: 'Sep 25', day: -15, historical: 14500, projected: null },
  { date: 'Sep 30', day: -10, historical: 15200, projected: null },
  { date: 'Oct 5', day: -5, historical: 16800, projected: null },
  { date: 'Oct 10', day: 0, historical: 18400, projected: null },
  { date: 'Oct 15', day: 5, historical: null, projected: 19200 },
  { date: 'Oct 20', day: 10, historical: null, projected: 21000 },
  { date: 'Oct 25', day: 15, historical: null, projected: 22800 },
  { date: 'Oct 30', day: 20, historical: null, projected: 24600 },
  { date: 'Nov 5', day: 25, historical: null, projected: 26200 },
  { date: 'Nov 10', day: 30, historical: null, projected: 28600 },
  { date: 'Nov 15', day: 35, historical: null, projected: 31200 },
  { date: 'Nov 20', day: 40, historical: null, projected: 33800 },
  { date: 'Nov 30', day: 50, historical: null, projected: 38400 },
  { date: 'Dec 10', day: 60, historical: null, projected: 41200 },
  { date: 'Dec 20', day: 70, historical: null, projected: 44800 },
  { date: 'Dec 30', day: 80, historical: null, projected: 47900 },
  { date: 'Jan 8', day: 90, historical: null, projected: 51600 },
];

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/dashboard/summary', () => MOCK_SUMMARY);
registerMockHandler('GET', '/dashboard/transactions', () => MOCK_TRANSACTIONS);
registerMockHandler('GET', '/dashboard/platform-revenue', () => MOCK_PLATFORM_REVENUE);
registerMockHandler('GET', '/dashboard/cashflow', () => MOCK_CASH_FLOW);

/* ── API functions ──────────────────────────────────────────────────── */

/** Days covered by each forecast range tab. */
const RANGE_DAYS: Record<ForecastRange, number> = {
  '30D': 30,
  '60D': 60,
  '90D': 90,
};

/** GET /dashboard/summary — wallet balances, monthly change, and CCS. */
export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return get<DashboardSummary>('/dashboard/summary');
}

/** GET /dashboard/transactions — recent wallet activity. */
export function fetchDashboardTransactions(): Promise<DashboardTransaction[]> {
  return get<DashboardTransaction[]>('/dashboard/transactions');
}

/** GET /dashboard/platform-revenue — monthly revenue per platform. */
export function fetchPlatformRevenue(): Promise<PlatformRevenueSummary> {
  return get<PlatformRevenueSummary>('/dashboard/platform-revenue');
}

/**
 * GET /dashboard/cashflow?range=30|60|90 — historical + projected cash flow
 * within ±`range` days of today.
 *
 * The mock adapter matches on pathname only and drops query strings, so the
 * range window is also applied here; a real backend already scopes its
 * response to the requested range, making the filter a no-op in that mode.
 */
export async function fetchCashFlow(range: ForecastRange): Promise<CashFlowPoint[]> {
  const days = RANGE_DAYS[range];
  const points = await get<CashFlowPoint[]>(`/dashboard/cashflow?range=${days}`);
  return points.filter((p) => p.day >= -days && p.day <= days);
}
