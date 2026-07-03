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
