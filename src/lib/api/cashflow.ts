/**
 * Cash flow domain module.
 *
 * Typed API functions for the Cash Flow page plus the mock handlers that
 * serve its data when `VITE_API_URL` is unset. Registering the handlers
 * happens as a side effect of importing this module (see
 * src/lib/mock/registry.ts for the pattern), so pages only need to import
 * the functions below.
 *
 * The mock backend keeps mutable in-module state for the tax reserve:
 * POST /cashflow/reserve updates the reserve settings (and recomputes the
 * quarterly target), so subsequent GET /cashflow/tax calls reflect the
 * mutation for the rest of the session.
 */
import { ApiError, get, post } from '../api';
import { registerMockHandler } from '../mock/registry';
import type { ForecastPoint } from './types';

/* ── Types ──────────────────────────────────────────────────────────── */

/** Forecast horizons accepted by GET /cashflow/forecast?days=N. */
export type ForecastDays = 30 | 60 | 90;

/** A suggested next step attached to an AI insight. */
export type InsightActionKind = 'advance' | 'defer' | 'withholding';

/** One tappable action chip under the AI insight message. */
export interface InsightAction {
  kind: InsightActionKind;
  /** Chip label, e.g. 'Apply for a $5K advance'. */
  label: string;
}

/** The Kre8trix AI cash-flow insight shown in the page banner. */
export interface CashFlowInsight {
  message: string;
  /** Relative freshness label, e.g. 'Just now'. */
  timeLabel: string;
  actions: InsightAction[];
}

/** Payload of GET /cashflow/forecast?days=N. */
export interface CashFlowForecast {
  insight: CashFlowInsight;
  /** Chart points: historical `actual` then `projected` with lo/hi band. */
  points: ForecastPoint[];
}

/** One month cell in the seasonality heatmap. */
export interface SeasonalityMonth {
  /** Short month label, e.g. 'Jan'. */
  month: string;
  /** Income intensity relative to the strongest month, 0-100. */
  intensity: number;
  /** Deviation vs the monthly average, e.g. '+38%'. */
  vsAverage: string;
}

/** Payload of GET /cashflow/seasonality — trailing-12-month heatmap grid. */
export interface SeasonalityData {
  months: SeasonalityMonth[];
  /** Callout line, e.g. 'December is historically your strongest month.' */
  note: string;
}

/** How the tax reserve contribution is computed. */
export type ReserveMode = 'pct' | 'amount';

/** The creator's auto-reserve configuration. */
export interface ReserveSettings {
  mode: ReserveMode;
  /** Percent of each payout reserved when mode = 'pct'. */
  pct: number;
  /** Flat monthly reserve in USD when mode = 'amount'. */
  amount: number;
}

/** Reserve progress toward the current quarter's tax bill. */
export interface ReserveStatus {
  /** Reserved so far this quarter, USD. */
  saved: number;
  /** Reserve goal for the quarter, USD. */
  target: number;
  settings: ReserveSettings;
}

/** Payload of GET /cashflow/tax. */
export interface TaxStatus {
  /** Whether auto-withholding is currently on. */
  withholdingEnabled: boolean;
  /** Effective withholding rate as a percent, e.g. 24. */
  withholdingRate: number;
  /** Current quarter label, e.g. 'Q4 2024'. */
  quarter: string;
  /** Estimated quarterly payment, USD. */
  quarterlyEstimate: number;
  /** Payment deadline label, e.g. 'Jan 15, 2025'. */
  dueDate: string;
  reserve: ReserveStatus;
}

/** Body of POST /cashflow/reserve — set exactly one of `pct` or `amount`. */
export interface ReserveRequest {
  /** Percent of each payout to reserve (switches mode to 'pct'). */
  pct?: number;
  /** Flat monthly USD to reserve (switches mode to 'amount'). */
  amount?: number;
}

/* ── Mock data ──────────────────────────────────────────────────────── */

/** Trailing average monthly income used to size the mock reserve target. */
const MOCK_MONTHLY_INCOME = 8200;

const MOCK_INSIGHT: CashFlowInsight = {
  message:
    'Your October looks tight. Q4 AdSense typically drops 23% for your category. Consider activating your equipment credit line.',
  timeLabel: 'Just now',
  actions: [
    { kind: 'advance', label: 'Apply for a $5K advance' },
    { kind: 'defer', label: 'Defer equipment purchase' },
    { kind: 'withholding', label: 'Adjust tax withholding' },
  ],
};

/**
 * A mock forecast point carries the horizon it belongs to, so the single
 * GET /cashflow/forecast handler can serve every range at once (the mock
 * adapter matches on pathname only and drops the `days` query string).
 */
type RangedForecastPoint = ForecastPoint & { range?: ForecastDays };

const MOCK_FORECAST_30: RangedForecastPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isProjected = day > 18;
  const base = 420 + Math.sin(day * 0.3) * 150 + day * 12;
  return {
    range: 30 as const,
    day: `${day}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.85) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.15) : undefined,
  };
});

const MOCK_FORECAST_60: RangedForecastPoint[] = Array.from({ length: 8 }, (_, i) => {
  const week = i + 1;
  const isProjected = week > 3;
  const base = 3200 + Math.sin(week * 0.8) * 800 + week * 300;
  return {
    range: 60 as const,
    day: `W${week}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.8) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.2) : undefined,
  };
});

const MOCK_FORECAST_90: RangedForecastPoint[] = Array.from({ length: 12 }, (_, i) => {
  const week = i + 1;
  const isProjected = week > 5;
  const base = 2800 + Math.sin(week * 0.6) * 1000 + week * 200;
  return {
    range: 90 as const,
    day: `W${week}`,
    actual: isProjected ? undefined : Math.round(base),
    projected: isProjected ? Math.round(base) : undefined,
    projectedLow: isProjected ? Math.round(base * 0.75) : undefined,
    projectedHigh: isProjected ? Math.round(base * 1.25) : undefined,
  };
});

const MOCK_FORECAST_POINTS: RangedForecastPoint[] = [
  ...MOCK_FORECAST_30,
  ...MOCK_FORECAST_60,
  ...MOCK_FORECAST_90,
];

const MOCK_SEASONALITY: SeasonalityData = {
  months: [
    { month: 'Jan', intensity: 38, vsAverage: '-24%' },
    { month: 'Feb', intensity: 42, vsAverage: '-18%' },
    { month: 'Mar', intensity: 55, vsAverage: '-4%' },
    { month: 'Apr', intensity: 58, vsAverage: '+1%' },
    { month: 'May', intensity: 62, vsAverage: '+8%' },
    { month: 'Jun', intensity: 48, vsAverage: '-12%' },
    { month: 'Jul', intensity: 45, vsAverage: '-16%' },
    { month: 'Aug', intensity: 52, vsAverage: '-8%' },
    { month: 'Sep', intensity: 66, vsAverage: '+15%' },
    { month: 'Oct', intensity: 72, vsAverage: '+22%' },
    { month: 'Nov', intensity: 88, vsAverage: '+38%' },
    { month: 'Dec', intensity: 100, vsAverage: '+52%' },
  ],
  note: 'December is historically your strongest month — Q4 CPMs lift ad revenue across your category.',
};

/** Quarterly reserve target for a given percent-of-income setting. */
function pctTarget(pct: number): number {
  return Math.round(MOCK_MONTHLY_INCOME * 3 * (pct / 100));
}

/** Mutable mock tax state; POST /cashflow/reserve updates the reserve. */
const mockTax: TaxStatus = {
  withholdingEnabled: true,
  withholdingRate: 24,
  quarter: 'Q4 2024',
  quarterlyEstimate: 4920,
  dueDate: 'Jan 15, 2025',
  reserve: {
    saved: 2540,
    target: pctTarget(15),
    settings: { mode: 'pct', pct: 15, amount: 1200 },
  },
};

/** Deep-copies the mock tax state so callers can't mutate it in place. */
function taxSnapshot(): TaxStatus {
  return {
    ...mockTax,
    reserve: { ...mockTax.reserve, settings: { ...mockTax.reserve.settings } },
  };
}

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/cashflow/forecast', () => ({
  insight: MOCK_INSIGHT,
  points: MOCK_FORECAST_POINTS,
}));

registerMockHandler('GET', '/cashflow/seasonality', () => MOCK_SEASONALITY);

registerMockHandler('GET', '/cashflow/tax', () => taxSnapshot());

registerMockHandler('POST', '/cashflow/reserve', (_params, body) => {
  const { pct, amount } = (body ?? {}) as ReserveRequest;
  const hasPct = typeof pct === 'number';
  const hasAmount = typeof amount === 'number';
  if (hasPct === hasAmount) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Provide exactly one of `pct` or `amount`.');
  }
  if (hasPct && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Reserve percent must be between 0 and 100.');
  }
  if (hasAmount && (!Number.isFinite(amount) || amount <= 0)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Reserve amount must be a positive number.');
  }

  if (hasPct) {
    mockTax.reserve.settings = { ...mockTax.reserve.settings, mode: 'pct', pct };
    mockTax.reserve.target = pctTarget(pct);
  } else {
    mockTax.reserve.settings = { ...mockTax.reserve.settings, mode: 'amount', amount: amount as number };
    mockTax.reserve.target = Math.round((amount as number) * 3);
  }

  return taxSnapshot().reserve;
});

/* ── API functions ──────────────────────────────────────────────────── */

/**
 * GET /cashflow/forecast?days=30|60|90 — forecast points for the horizon
 * plus the AI insight derived from it.
 *
 * The mock adapter matches on pathname only and drops query strings, so the
 * mock serves every range with each point tagged by horizon and the filter
 * below selects the requested one; a real backend returns untagged points
 * already scoped to `days`, making the filter a no-op in that mode.
 */
export async function fetchCashFlowForecast(days: ForecastDays): Promise<CashFlowForecast> {
  const res = await get<{ insight: CashFlowInsight; points: RangedForecastPoint[] }>(
    `/cashflow/forecast?days=${days}`,
  );
  return {
    insight: res.insight,
    points: res.points.filter((p) => p.range === undefined || p.range === days),
  };
}

/** Convenience: the AI insight only (served by GET /cashflow/forecast). */
export async function fetchCashFlowInsight(): Promise<CashFlowInsight> {
  const { insight } = await fetchCashFlowForecast(30);
  return insight;
}

/** GET /cashflow/seasonality — trailing-12-month income heatmap grid. */
export function fetchSeasonality(): Promise<SeasonalityData> {
  return get<SeasonalityData>('/cashflow/seasonality');
}

/** GET /cashflow/tax — withholding status, quarterly estimate, reserve. */
export function fetchTaxStatus(): Promise<TaxStatus> {
  return get<TaxStatus>('/cashflow/tax');
}

/** POST /cashflow/reserve — save the auto-reserve plan (pct or amount). */
export function saveReserveSettings(body: ReserveRequest): Promise<ReserveStatus> {
  return post<ReserveStatus>('/cashflow/reserve', body);
}
