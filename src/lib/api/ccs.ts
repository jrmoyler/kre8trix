/**
 * Creator Credit Score (CCS) domain module.
 *
 * Endpoints:
 *   GET  /ccs/score    — current score, tier, trend, and monthly history
 *   GET  /ccs/signals  — the 7 weighted input signals behind the score
 *   POST /ccs/simulate — projects the score for adjusted signal values
 *
 * Typed API functions for the Credit Score page plus the mock handlers that
 * serve its data when `VITE_API_URL` is unset. Registering the handlers
 * happens as a side effect of importing this module (see
 * src/lib/mock/registry.ts for the pattern), so pages only need to import
 * the functions below.
 */
import { ApiError, get, post } from '../api';
import { registerMockHandler } from '../mock/registry';
import type { CCSHistoryPoint, CCSSignal, CCSTier, CCSTierName } from './types';

/* ── Types ──────────────────────────────────────────────────────────── */

/** Direction and size of the recent score movement. */
export interface CCSTrend {
  /** Signed point change over the period, e.g. +47. */
  delta: number;
  /** Period label, e.g. 'this quarter'. */
  period: string;
}

/** Payload of GET /ccs/score — the hero ring's data. */
export interface CCSScoreSummary {
  /** Current score, e.g. 612. */
  score: number;
  /** Scale maximum, e.g. 850. */
  maxScore: number;
  tier: CCSTierName;
  /** Standing label, e.g. 'Top 34% of creators on Kre8trix'. */
  percentile: string;
  trend: CCSTrend;
  /** Monthly score history, oldest first. */
  history: CCSHistoryPoint[];
}

/** Body of POST /ccs/simulate. */
export interface CCSSimulationRequest {
  /** Adjusted signal sub-scores keyed by signal name (300-850 scale). */
  adjustments: Record<string, number>;
}

/** Response of POST /ccs/simulate. */
export interface CCSSimulationResult {
  /** Score projected from the adjusted signal values. */
  projectedScore: number;
  /** Projected change versus the current score. */
  delta: number;
}

/* ── Mock data ──────────────────────────────────────────────────────── */

const MIN_SCORE = 300;
const MAX_SCORE = 850;
const CURRENT_SCORE = 612;

const MOCK_SIGNALS: CCSSignal[] = [
  { name: 'Income Consistency', weight: 22, score: 720, color: '#C8FF00' },
  { name: 'Monetization Diversification', weight: 18, score: 580, color: '#00D4FF' },
  { name: 'Audience Durability', weight: 17, score: 640, color: '#9B5DE5' },
  { name: 'Financial Behavior', weight: 16, score: 510, color: '#FF4D00' },
  { name: 'Platform Risk', weight: 13, score: 680, color: '#FF4D4D' },
  { name: 'Business Maturity', weight: 10, score: 490, color: '#FFD400' },
  { name: 'Growth Trajectory', weight: 4, score: 620, color: '#00E5A0' },
];

const MOCK_HISTORY: CCSHistoryPoint[] = [
  { month: 'May', score: 550 },
  { month: 'Jun', score: 565 },
  { month: 'Jul', score: 558 },
  { month: 'Aug', score: 578 },
  { month: 'Sep', score: 595 },
  { month: 'Oct', score: 612 },
];

const MOCK_SCORE: CCSScoreSummary = {
  score: CURRENT_SCORE,
  maxScore: MAX_SCORE,
  tier: 'Rising',
  percentile: 'Top 34% of creators on Kre8trix',
  trend: { delta: 47, period: 'this quarter' },
  history: MOCK_HISTORY,
};

/** CCS tier ladder — static reference data shared by CCS UIs. */
export const CCS_TIERS: CCSTier[] = [
  { name: 'Emerging', range: '300-499', color: '#9B5DE5', benefits: ['Basic wallet', 'Standard advances up to $1K'] },
  { name: 'Rising', range: '500-649', color: '#00D4FF', benefits: ['Priority payouts', 'Advances up to $5K', '1% cashback'] },
  { name: 'Stable', range: '650-749', color: '#C8FF00', benefits: ['Instant advances up to $15K', '2% cashback', 'Lower fees'] },
  { name: 'Prime', range: '750-850', color: '#FFD400', benefits: ['Unlimited advances', '3% cashback', 'White-glove support'] },
];

/* ── Scoring math ───────────────────────────────────────────────────── */

/**
 * Weight-averaged score across the 7 signals. Values override each signal's
 * current sub-score by name; unadjusted signals keep their live value.
 */
function weightedScore(values: Record<string, number>): number {
  let sum = 0;
  let weightTotal = 0;
  for (const signal of MOCK_SIGNALS) {
    sum += signal.weight * (values[signal.name] ?? signal.score);
    weightTotal += signal.weight;
  }
  return weightTotal ? sum / weightTotal : 0;
}

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/ccs/score', () => MOCK_SCORE);
registerMockHandler('GET', '/ccs/signals', () => MOCK_SIGNALS);

registerMockHandler('POST', '/ccs/simulate', (_params, body) => {
  const { adjustments } = (body ?? {}) as Partial<CCSSimulationRequest>;
  if (!adjustments || typeof adjustments !== 'object') {
    throw new ApiError(400, 'INVALID_BODY', 'Expected { adjustments: Record<signalName, value> }.');
  }

  const clamped: Record<string, number> = {};
  for (const signal of MOCK_SIGNALS) {
    const raw = adjustments[signal.name];
    if (raw === undefined) continue;
    if (typeof raw !== 'number' || Number.isNaN(raw)) {
      throw new ApiError(400, 'INVALID_SIGNAL_VALUE', `Signal '${signal.name}' must be a number.`);
    }
    clamped[signal.name] = Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw));
  }

  // Shift the current score by the weighted delta of the adjusted signals,
  // so untouched sliders project exactly the live score.
  const shifted = Math.round(CURRENT_SCORE + weightedScore(clamped) - weightedScore({}));
  const projectedScore = Math.min(MAX_SCORE, Math.max(MIN_SCORE, shifted));
  return { projectedScore, delta: projectedScore - CURRENT_SCORE } satisfies CCSSimulationResult;
});

/* ── API functions ──────────────────────────────────────────────────── */

/** GET /ccs/score — current score, tier, trend, and history. */
export function fetchCCSScore(): Promise<CCSScoreSummary> {
  return get<CCSScoreSummary>('/ccs/score');
}

/** GET /ccs/signals — the 7-signal weighted breakdown. */
export function fetchCCSSignals(): Promise<CCSSignal[]> {
  return get<CCSSignal[]>('/ccs/signals');
}

/** POST /ccs/simulate — projects the score for adjusted signal values. */
export function simulateCCS(adjustments: Record<string, number>): Promise<CCSSimulationResult> {
  return post<CCSSimulationResult>('/ccs/simulate', { adjustments } satisfies CCSSimulationRequest);
}
