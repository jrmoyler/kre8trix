/**
 * Advances domain module.
 *
 * Typed API functions for the Advances page plus the mock handlers that serve
 * its data when `VITE_API_URL` is unset. Registering the handlers happens as
 * a side effect of importing this module (see src/lib/mock/registry.ts for
 * the pattern), so pages only need to import the functions below.
 *
 * The mock backend keeps mutable in-module state: POST /advances/apply
 * validates the requested amount against the remaining limit, prepends a new
 * advance record, and bumps the used amount, so subsequent GETs of
 * /advances/active and /advances/eligibility reflect the mutation for the
 * rest of the session.
 */
import { ApiError, get, post } from '../api';
import { registerMockHandler } from '../mock/registry';
import type { AdvanceStatus, CCSTierName } from './types';

/* ── Types ──────────────────────────────────────────────────────────── */

/** Status labels shown on active-advance cards. */
export type ActiveAdvanceStatus = 'Active — Repaying' | 'Pending';

/** An advance currently outstanding, with repayment progress. */
export interface ActiveAdvance {
  /** Advance reference, e.g. 'KRA-2847'. */
  id: string;
  /** Principal amount in USD. */
  amount: number;
  /** Flat fee in USD. */
  fee: number;
  /** Fee as a percentage of principal, e.g. 6. */
  feePercent: number;
  /** Amount repaid so far in USD. */
  repaid: number;
  /** Total owed (amount + fee). */
  total: number;
  /** Repayment progress, 0-100. */
  percentRepaid: number;
  /** Issue date label, e.g. 'Sep 15, 2024'. */
  issued: string;
  /** e.g. '10% of monthly income'. */
  repaymentRate: string;
  /** Estimated payoff label, e.g. 'Nov 20' or '~2 months'. */
  estCompletion: string;
  status: ActiveAdvanceStatus;
}

/** The CCS gate an account must clear to draw advances. */
export interface CCSGate {
  /** Current Creator Credit Score, e.g. 612. */
  score: number;
  tier: CCSTierName;
  /** Minimum score required for advances, e.g. 500. */
  minScore: number;
}

/** Payload of GET /advances/eligibility. */
export interface AdvanceEligibility {
  eligible: boolean;
  /** Total advance limit in USD, e.g. 5000. */
  maxAmount: number;
  /** Amount of the limit currently drawn, e.g. 2500. */
  usedAmount: number;
  /** Flat fee percentage applied to new advances, e.g. 6. */
  feePct: number;
  /** Share of monthly income routed to repayment, e.g. 10. */
  repaymentRatePct: number;
  /** Trailing average monthly income in USD, e.g. 8200. */
  monthlyIncome: number;
  ccsGate: CCSGate;
}

/** One row of GET /advances/history. */
export interface AdvanceHistoryItem {
  id: string;
  /** Issue date label, e.g. 'Sep 15, 2024'. */
  date: string;
  amount: number;
  fee: number;
  repaid: number;
  status: AdvanceStatus;
  /** Repayment progress, 0-100. */
  completion: number;
}

/** Body of POST /advances/apply. */
export interface ApplyAdvanceRequest {
  /** Positive USD amount, at most the remaining limit. */
  amount: number;
}

/* ── Mock state ─────────────────────────────────────────────────────── */

/** Mutable eligibility snapshot; applies bump `usedAmount`. */
const mockEligibility: AdvanceEligibility = {
  eligible: true,
  maxAmount: 5000,
  usedAmount: 2500,
  feePct: 6,
  repaymentRatePct: 10,
  monthlyIncome: 8200,
  ccsGate: { score: 612, tier: 'Rising', minScore: 500 },
};

/** Mutable active advances, newest first; applies prepend entries. */
const mockActiveAdvances: ActiveAdvance[] = [
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

const mockAdvanceHistory: AdvanceHistoryItem[] = [
  { id: 'KRA-2847', date: 'Sep 15, 2024', amount: 2500, fee: 62, repaid: 1125, status: 'Active', completion: 45 },
  { id: 'KRA-2734', date: 'Jul 3, 2024', amount: 1000, fee: 25, repaid: 1025, status: 'Repaid', completion: 100 },
  { id: 'KRA-2601', date: 'May 20, 2024', amount: 3500, fee: 87, repaid: 3587, status: 'Repaid', completion: 100 },
  { id: 'KRA-2489', date: 'Mar 12, 2024', amount: 1500, fee: 37, repaid: 1537, status: 'Repaid', completion: 100 },
];

let nextAdvanceNumber = 2901;

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/advances/eligibility', () => ({
  ...mockEligibility,
  ccsGate: { ...mockEligibility.ccsGate },
}));

registerMockHandler('GET', '/advances/active', () => mockActiveAdvances.map((a) => ({ ...a })));

registerMockHandler('GET', '/advances/history', () => mockAdvanceHistory.map((h) => ({ ...h })));

registerMockHandler('POST', '/advances/apply', (_params, body) => {
  const { amount } = (body ?? {}) as Partial<ApplyAdvanceRequest>;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'A positive advance amount is required.');
  }
  const available = mockEligibility.maxAmount - mockEligibility.usedAmount;
  if (amount > available) {
    throw new ApiError(
      422,
      'OVER_LIMIT',
      `$${amount.toLocaleString()} exceeds your available limit — $${available.toLocaleString()} of your $${mockEligibility.maxAmount.toLocaleString()} limit remains.`,
    );
  }
  if (mockEligibility.ccsGate.score < mockEligibility.ccsGate.minScore) {
    throw new ApiError(
      403,
      'CCS_GATE',
      `A CCS score of at least ${mockEligibility.ccsGate.minScore} is required for advances.`,
    );
  }

  const fee = Math.round(amount * (mockEligibility.feePct / 100));
  const total = amount + fee;
  const monthlyDeduction = mockEligibility.monthlyIncome * (mockEligibility.repaymentRatePct / 100);
  const payoffMonths = Math.max(1, Math.ceil(total / monthlyDeduction));
  const advance: ActiveAdvance = {
    id: `KRA-${nextAdvanceNumber++}`,
    amount,
    fee,
    feePercent: mockEligibility.feePct,
    repaid: 0,
    total,
    percentRepaid: 0,
    issued: 'Today',
    repaymentRate: `${mockEligibility.repaymentRatePct}% of monthly income`,
    estCompletion: `~${payoffMonths} month${payoffMonths !== 1 ? 's' : ''}`,
    status: 'Pending',
  };
  mockActiveAdvances.unshift(advance);
  mockEligibility.usedAmount += amount;
  return { ...advance };
});

/* ── API functions ──────────────────────────────────────────────────── */

/** GET /advances/eligibility — limit, fee terms, and the CCS gate. */
export function fetchAdvanceEligibility(): Promise<AdvanceEligibility> {
  return get<AdvanceEligibility>('/advances/eligibility');
}

/** GET /advances/active — outstanding advances with repayment progress. */
export function fetchActiveAdvances(): Promise<ActiveAdvance[]> {
  return get<ActiveAdvance[]>('/advances/active');
}

/** GET /advances/history — past and current advances, newest first. */
export function fetchAdvanceHistory(): Promise<AdvanceHistoryItem[]> {
  return get<AdvanceHistoryItem[]>('/advances/history');
}

/** POST /advances/apply — request a new advance; resolves with the record. */
export function applyForAdvance(amount: number): Promise<ActiveAdvance> {
  return post<ActiveAdvance>('/advances/apply', { amount } satisfies ApplyAdvanceRequest);
}
