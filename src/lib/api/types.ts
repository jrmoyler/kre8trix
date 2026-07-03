/**
 * Shared domain types for the Kre8trix API layer.
 *
 * Field shapes are derived from the mock data currently hardcoded in
 * src/pages/*.tsx (Dashboard, Wallet, CreditScore, CashFlow, Advances) and
 * src/components/Layout.tsx, so domain modules can serve that data through
 * the mock registry without reshaping it.
 */

/** Currencies held in the Kre8trix wallet. */
export type Currency = 'USD' | 'USDC';

/* ── User / profile ─────────────────────────────────────────────────── */

/** CCS tier names, ordered lowest to highest. */
export type CCSTierName = 'Emerging' | 'Rising' | 'Stable' | 'Prime';

/** The signed-in creator's account profile. */
export interface User {
  id: string;
  /** Display name, e.g. 'Alex Creates'. */
  name: string;
  /** Public handle, e.g. '@alexcreates'. */
  handle: string;
  email: string;
  /** Path or URL to the avatar image, e.g. '/avatar-creator-1.png'. */
  avatarUrl: string;
}

/** Creator-economy profile extending the base user with CCS standing. */
export interface CreatorProfile extends User {
  /** Current Creator Credit Score (300-850 scale). */
  ccsScore: number;
  tier: CCSTierName;
  /** Trailing average monthly income in USD, e.g. 8200. */
  monthlyIncome: number;
}

/* ── Wallet ─────────────────────────────────────────────────────────── */

export type TransactionType = 'Income' | 'Expense' | 'Convert';
export type TransactionStatus = 'Completed' | 'Pending';

/** A single wallet ledger entry (payout, spend, or conversion). */
export interface Transaction {
  id: string;
  /** Human-readable date label, e.g. 'Oct 15, 2024'. */
  date: string;
  /** e.g. 'YouTube Ad Revenue', 'Equipment Purchase'. */
  description: string;
  type: TransactionType;
  currency: Currency;
  /** Signed amount: positive = inflow, negative = outflow. */
  amount: number;
  status: TransactionStatus;
  /** Source platform, e.g. 'YouTube', 'Stripe', 'Kre8trix Card'. */
  platform?: string;
  /** Hex brand color for the platform icon, e.g. '#FF0000'. */
  iconColor?: string;
}

/** A single-currency wallet balance. */
export interface Balance {
  currency: Currency;
  /** Available amount in the currency's units, e.g. 24850.00. */
  amount: number;
  /** Recent balance history for sparkline rendering (oldest first). */
  sparkline?: number[];
}

/* ── Creator Credit Score ───────────────────────────────────────────── */

/** One weighted input signal of the Creator Credit Score. */
export interface CCSSignal {
  /** e.g. 'Income Consistency', 'Platform Risk'. */
  name: string;
  /** Contribution weight as a percentage (all signals sum to 100). */
  weight: number;
  /** Sub-score for this signal on the 300-850 scale. */
  score: number;
  /** Hex accent color used in charts, e.g. '#C8FF00'. */
  color: string;
}

/** A month/score pair in the CCS trend history. */
export interface CCSHistoryPoint {
  /** Short month label, e.g. 'Oct'. */
  month: string;
  score: number;
}

/** The creator's full Creator Credit Score payload. */
export interface CCSScore {
  /** Current score, e.g. 612. */
  score: number;
  /** Scale maximum, e.g. 850. */
  maxScore: number;
  tier: CCSTierName;
  signals: CCSSignal[];
  history: CCSHistoryPoint[];
}

/** A CCS tier definition with its score range and perks. */
export interface CCSTier {
  name: CCSTierName;
  /** Score range label, e.g. '500-649'. */
  range: string;
  /** Hex accent color, e.g. '#00D4FF'. */
  color: string;
  /** Perks unlocked at this tier. */
  benefits: string[];
}

/* ── Cash flow forecast ─────────────────────────────────────────────── */

/**
 * One point on a cash-flow forecast chart. Historical points set `actual`;
 * projected points set `projected` plus the low/high confidence band.
 */
export interface ForecastPoint {
  /** X-axis label: a day ('12') or week ('W4') depending on range. */
  day: string;
  actual?: number;
  projected?: number;
  projectedLow?: number;
  projectedHigh?: number;
}

/** Supported forecast ranges. */
export type ForecastRange = '30D' | '60D' | '90D';

/* ── Advances ───────────────────────────────────────────────────────── */

export type AdvanceStatus = 'Active' | 'Repaid' | 'Pending' | 'Defaulted';

/** A cash advance issued against future creator income. */
export interface Advance {
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
  status: AdvanceStatus;
  /** e.g. '10% of monthly income'. */
  repaymentRate?: string;
  /** Estimated payoff date label, e.g. 'Nov 20'. */
  estCompletion?: string;
}

/* ── Platform connections ───────────────────────────────────────────── */

/** A revenue platform linked (or linkable) to the creator's account. */
export interface PlatformConnection {
  /** Platform name, e.g. 'YouTube', 'Stripe'. */
  name: string;
  /** Connected account label, e.g. '@alexcreates'; empty when unlinked. */
  user: string;
  connected: boolean;
  /** Hex brand color, e.g. '#FF0000'. */
  color?: string;
}

/* ── Notifications ──────────────────────────────────────────────────── */

/** An in-app notification shown in the header bell menu. */
export interface Notification {
  id: number;
  /** e.g. 'Payout received'. */
  title: string;
  /** Supporting line, e.g. 'YouTube Ad Revenue — $4,850.00 deposited'. */
  detail: string;
  /** Relative time label, e.g. '2h ago'. */
  time: string;
  read: boolean;
}
