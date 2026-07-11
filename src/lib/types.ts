/* Shared API types used by the mock backend and the UI. */

export interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  tier: string;
  /* D1: denormalized KYC status summary — see the full KycProfile shape below. */
  kycStatus?: KycStatus;
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

/* ── C5: notifications ── */

export type NotificationType = 'payment' | 'advance' | 'ccs' | 'tax' | 'platform' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app route opened when the notification is clicked. */
  actionPath: string;
  read: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
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

/** Pragmatic email shape check (local@domain.tld) shared by the login form
 *  and the mock API boundary — mirrors what a real API must enforce. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
/* ─────────────── C3: Tax Center ─────────────── */

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export interface TaxEstimateSettings {
  /** Effective tax rate applied to YTD income (percent, 10-50). */
  effectiveRatePercent: number;
  filingStatus: FilingStatus;
}

export interface QuarterlyEstimate {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  period: string;
  dueDate: string;
  amount: number;
  /** Portion of `amount` already covered by the tax reserve. */
  reserved: number;
  status: 'Covered' | 'Partial' | 'Unfunded';
}

export interface TurboTaxConnection {
  connected: boolean;
  account: string | null;
  lastSync: string | null;
}

export interface TaxSummary {
  taxYear: number;
  ytdIncome: number;
  settings: TaxEstimateSettings;
  totalEstimated: number;
  reserved: number;
  stillNeeded: number;
  quarters: QuarterlyEstimate[];
  turbotax: TurboTaxConnection;
}

export interface Ten99kRow {
  platform: string;
  color: string;
  grossPayments: number;
  transactionCount: number;
  /** Federal 1099-K reporting threshold for gross payments. */
  threshold: number;
  formStatus: 'Expected' | 'On track' | 'Below threshold';
}

/* ─────────────── end C3: Tax Center ─────────────── */
/* ── C4: platform connect OAuth (authorization-code flow) ────── */

/** Platforms that connect via the OAuth 2.0 authorization-code flow. */
export type OAuthPlatform = 'youtube' | 'tiktok' | 'stripe';

/** Response of GET /oauth/:platform/start. */
export interface OAuthStartResponse {
  platform: OAuthPlatform;
  /** SPA path of the provider consent screen, carrying the OAuth params. */
  authorizeUrl: string;
  /** Random CSRF state token — also persisted client-side for validation. */
  state: string;
}

/** Body of POST /oauth/authorize/decision (mock provider consent screen). */
export interface OAuthDecisionPayload {
  state: string;
  decision: 'allow' | 'deny';
}

/** Response of POST /oauth/authorize/decision. */
export interface OAuthDecisionResponse {
  /** SPA path the provider redirects back to (the client redirect_uri). */
  redirect: string;
}

/** Body of POST /oauth/token. */
export interface OAuthTokenPayload {
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
  client_id: string;
}

/** Response of POST /oauth/token. */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
  platform: OAuthPlatform;
  /** Updated connections snapshot so the UI can reflect the new link. */
  connections: PlatformConnection[];
}

/* ── D1: KYC/KYB identity verification ─────────────────────────── */

export type KycStatus = 'unverified' | 'pending' | 'in_review' | 'verified' | 'rejected' | 'action_required';
export type KycEntityType = 'individual' | 'business';
export type KycDocumentType = 'passport' | 'drivers_license' | 'national_id' | 'business_registration';
export type KycStepKey = 'entity_type' | 'personal_info' | 'business_info' | 'documents' | 'selfie' | 'review';

export interface KycDocument {
  id: string;
  type: KycDocumentType;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  status: 'uploaded' | 'verified' | 'rejected';
  rejectionReason?: string;
}

export interface KycSelfieCheck {
  completed: boolean;
  matchScore: number | null;
  completedAt: string | null;
}

export interface KycPersonalInfo {
  legalName: string;
  dateOfBirth: string;
  address: string;
  country: string;
  ssnLast4: string;
}

export interface KybBusinessInfo {
  legalBusinessName: string;
  ein: string;
  businessType: string;
  formationState: string;
}

export interface KycProfile {
  status: KycStatus;
  entityType: KycEntityType;
  personalInfo: KycPersonalInfo | null;
  businessInfo: KybBusinessInfo | null;
  documents: KycDocument[];
  selfie: KycSelfieCheck;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  currentStep: KycStepKey;
}

/* ── D2: AML transaction monitoring ────────────────────────────── */

export type AmlAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AmlAlertStatus = 'open' | 'under_review' | 'escalated' | 'cleared' | 'filed_sar';
export type AmlAlertReason =
  | 'large_transaction'
  | 'velocity'
  | 'structuring'
  | 'cross_wallet_pattern'
  | 'high_risk_recipient'
  | 'round_trip';

export interface AmlAlertNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface SarFiling {
  id: string;
  filedAt: string;
  filingRef: string;
  narrative: string;
  status: 'draft' | 'filed';
}

export interface AmlAlert {
  id: string;
  createdAt: string;
  severity: AmlAlertSeverity;
  status: AmlAlertStatus;
  reason: AmlAlertReason;
  subjectHandle: string;
  summary: string;
  relatedTransactionIds: string[];
  amountInvolved: number;
  notes: AmlAlertNote[];
  sar?: SarFiling;
}

export interface AmlSummary {
  openAlerts: number;
  criticalAlerts: number;
  sarsFiledYtd: number;
  monitoredVolume30d: number;
}

/* ── D3: immutable audit log ───────────────────────────────────── */

export type AuditActorType = 'user' | 'system' | 'compliance_officer';
export type AuditAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'send_funds'
  | 'convert_funds'
  | 'request_funds'
  | 'update_profile'
  | 'update_settings'
  | 'connect_platform'
  | 'disconnect_platform'
  | 'apply_advance'
  | 'apply_deal'
  | 'kyc_submit'
  | 'kyc_status_change'
  | 'aml_alert_status_change'
  | 'aml_sar_filed'
  | 'export_tax_data'
  | 'connect_turbotax';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorType: AuditActorType;
  actorName: string;
  action: AuditAction;
  description: string;
  relatedPath?: string;
  metadata?: Record<string, string | number | boolean>;
  prevHash: string;
  hash: string;
}
