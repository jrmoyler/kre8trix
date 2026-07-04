/* Shared API types used by the mock backend and the UI. */

export interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  tier: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WalletBalances {
  usd: number;
  usdc: number;
  usdSparkline: number[];
  usdcSparkline: number[];
}

export interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  platform: string;
  type: 'Income' | 'Expense' | 'Convert' | 'Send' | 'Request';
  currency: 'USD' | 'USDC';
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
  iconColor: string;
  /* C1: set on creator-to-creator sends */
  recipientHandle?: string;
  recipientAddress?: string;
}

export interface SendPayload {
  currency: 'USD' | 'USDC';
  amount: number;
  recipient: string;
  note?: string;
}

export interface ConvertPayload {
  from: 'USD' | 'USDC';
  amount: number;
}

export interface WalletMutationResponse {
  transaction: WalletTransaction;
  balances: WalletBalances;
}

export interface PlatformRevenue {
  platform: string;
  amount: number;
  color: string;
}

export interface PlatformRevenueSummary {
  platforms: PlatformRevenue[];
  total: number;
  changePercent: number;
}

export interface ForecastPoint {
  label: string;
  actual: number | null;
  projected: number | null;
  low: number | null;
  high: number | null;
}

export interface ForecastSummaryItem {
  window: ForecastWindow;
  label: string;
  amount: number;
  color: string;
}

export type ForecastWindow = '30D' | '60D' | '90D';

export interface CashFlowForecast {
  window: ForecastWindow;
  points: ForecastPoint[];
  summary: ForecastSummaryItem[];
  confidencePercent: number;
}

export interface SeasonalityMonth {
  month: string;
  index: number;
}

export interface TaxTracker {
  ytdIncome: number;
  estimatedRatePercent: number;
  estimatedOwed: number;
  setAside: number;
  nextDeadline: string;
}

export interface ReserveBuilder {
  goal: number;
  current: number;
  monthlyTarget: number;
  autoContribute: boolean;
}

export interface CcsSignal {
  name: string;
  weight: number;
  score: number;
  color: string;
}

export interface CcsScore {
  score: number;
  maxScore: number;
  tier: string;
  percentile: number;
  quarterDelta: number;
  history: { month: string; score: number }[];
  signals: CcsSignal[];
}

export interface CcsSimulationRequest {
  /** Signal name -> simulated signal score (300-850). */
  adjustments: Record<string, number>;
}

export interface CcsSimulationResult {
  projectedScore: number;
  delta: number;
  projectedTier: string;
}

export interface AdvanceEligibility {
  eligible: boolean;
  maxAmount: number;
  used: number;
  available: number;
  feePercent: number;
  ccsScore: number;
  tier: string;
}

export interface Advance {
  id: string;
  amount: number;
  fee: number;
  feePercent: number;
  repaid: number;
  total: number;
  issued: string;
  repaymentRate: string;
  estCompletion: string;
  status: 'Active' | 'Repaid' | 'Defaulted';
}

export interface AdvancesOverview {
  eligibility: AdvanceEligibility;
  active: Advance[];
  history: Advance[];
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  handle: string;
}

export interface PlatformConnection {
  name: string;
  user: string;
  connected: boolean;
}

export interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface AppSettings {
  notifications: NotificationSetting[];
  autoConvertUsdc: boolean;
  defaultPayoutWallet: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  accentColor: string;
}

/* ────────────────────────────────────────────────────────────────
 * C1 — creator-to-creator payments
 * ──────────────────────────────────────────────────────────────── */

/** A creator that can receive payments, returned by GET /creators/search. */
export interface Creator {
  id: string;
  /** Includes the leading '@'. */
  handle: string;
  displayName: string;
  /** Avatar initials, e.g. "ZO". */
  initials: string;
  /** Solana wallet address (base58). */
  walletAddress: string;
}

/** Entry in the "Recent recipients" row, returned by GET /wallet/recipients. */
export interface RecentRecipient {
  id: string;
  /** Null when the send went to a raw wallet address. */
  handle: string | null;
  displayName: string;
  walletAddress: string;
  /** Human-readable date label of the most recent send, e.g. "Oct 12, 2024". */
  lastSentAt: string;
}

/** Solana wallet address check: base58 alphabet, 32-44 chars. */
export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/* ── C2: brand deal marketplace ──────────────────────────────────── */

export type DealSort = 'match' | 'payout' | 'deadline';

export interface BrandDeal {
  id: string;
  brand: string;
  /** Accent color for the brand's initials logo. */
  brandColor: string;
  /** Short "about the brand" blurb shown in the detail view. */
  brandAbout: string;
  category: string;
  tagline: string;
  payoutMin: number;
  payoutMax: number;
  deliverables: string[];
  requirements: string[];
  payoutTerms: string;
  /** ISO date (YYYY-MM-DD) — sortable lexicographically. */
  deadline: string;
  /** Creator/brand fit, 0-100. */
  matchScore: number;
  /** True when the current user has an application for this deal. */
  applied: boolean;
}

export interface DealApplication {
  id: string;
  dealId: string;
  brand: string;
  brandColor: string;
  category: string;
  payoutMin: number;
  payoutMax: number;
  pitch: string;
  submitted: string;
  status: 'Pending' | 'Accepted';
}

export interface DealApplyResponse {
  application: DealApplication;
}
