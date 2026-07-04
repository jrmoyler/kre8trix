/*
 * Mutable state for the mock backend. Persisted to sessionStorage so
 * that sends, conversions, advance applications, and settings changes
 * survive route changes and reloads within a browser session.
 */

import type {
  Advance,
  AppNotification,
  AppSettings,
  PlatformConnection,
  Profile,
  ReserveBuilder,
  User,
  WalletTransaction,
} from '../types';

export interface MockState {
  user: User;
  profile: Profile;
  balances: { usd: number; usdc: number };
  transactions: WalletTransaction[];
  activeAdvances: Advance[];
  advanceHistory: Advance[];
  advanceUsed: number;
  connections: PlatformConnection[];
  settings: AppSettings;
  reserve: ReserveBuilder;
  notifications: AppNotification[];
  txCounter: number;
  advanceCounter: number;
  /* C5: notification id counter + last time the mock generator emitted one. */
  notifCounter: number;
  notifLastGeneratedAt: number;
}

const STORAGE_KEY = 'kre8trix.mock.state';

/* ── C5: notification seed ──
   Exported so handlers can re-seed sessions cached before the C5 shape existed. */

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export const NOTIF_COUNTER_START = 7;

export function seedNotifications(): AppNotification[] {
  return [
    { id: 'ntf_1', type: 'payment', title: 'Payout delayed', body: 'YouTube payout delayed 5 days — expected Oct 22.', actionPath: '/wallet?action=history', read: false, createdAt: hoursAgo(2) },
    { id: 'ntf_2', type: 'ccs', title: 'CCS score updated', body: 'Your Creator Credit Score rose to 612 (+17).', actionPath: '/credit-score', read: false, createdAt: hoursAgo(26) },
    { id: 'ntf_3', type: 'advance', title: 'Advance repayment', body: '$318 auto-deducted toward advance KRA-2847.', actionPath: '/advances', read: false, createdAt: hoursAgo(49) },
    { id: 'ntf_4', type: 'tax', title: 'Quarterly estimate ahead', body: 'Set aside $6,832 more before the Jan 15 deadline.', actionPath: '/cash-flow', read: false, createdAt: hoursAgo(74) },
    { id: 'ntf_5', type: 'platform', title: 'New platform synced', body: 'Shopify store connected and syncing revenue.', actionPath: '/settings', read: true, createdAt: hoursAgo(98) },
    { id: 'ntf_6', type: 'system', title: 'Security checkup', body: 'Review your connected devices and sessions.', actionPath: '/settings', read: true, createdAt: hoursAgo(150) },
  ];
}

function defaultState(): MockState {
  return {
    user: {
      id: 'usr_01',
      name: 'Alex Chen',
      email: 'alex@kre8trix.app',
      handle: '@alexcreates',
      tier: 'Rising',
    },
    profile: {
      name: 'Alex Chen',
      email: 'alex@kre8trix.app',
      phone: '+1 (555) 123-4567',
      handle: '@alexcreates',
    },
    balances: { usd: 24850, usdc: 12450 },
    transactions: [
      { id: 'tx_12', date: 'Oct 15, 2024', description: 'YouTube Ad Revenue', platform: 'YouTube', type: 'Income', currency: 'USD', amount: 4850, status: 'Completed', iconColor: '#FF0000' },
      { id: 'tx_11', date: 'Oct 14, 2024', description: 'TikTok Creator Fund', platform: 'TikTok', type: 'Income', currency: 'USD', amount: 1240, status: 'Completed', iconColor: '#FF0050' },
      { id: 'tx_10', date: 'Oct 13, 2024', description: 'Shopify Store Sales', platform: 'Shopify', type: 'Income', currency: 'USD', amount: 2180, status: 'Completed', iconColor: '#96BF48' },
      { id: 'tx_09', date: 'Oct 12, 2024', description: 'USDC → USD Conversion', platform: 'Kre8trix', type: 'Convert', currency: 'USD', amount: -500, status: 'Completed', iconColor: '#C8FF00' },
      { id: 'tx_08', date: 'Oct 11, 2024', description: 'Equipment Purchase', platform: 'Kre8trix Card', type: 'Expense', currency: 'USD', amount: -1299, status: 'Completed', iconColor: '#9B5DE5' },
      { id: 'tx_07', date: 'Oct 10, 2024', description: 'Stripe Payout', platform: 'Stripe', type: 'Income', currency: 'USD', amount: 3450, status: 'Pending', iconColor: '#635BFF' },
      { id: 'tx_06', date: 'Oct 9, 2024', description: 'Advance Repayment', platform: 'Kre8trix', type: 'Expense', currency: 'USD', amount: -1850, status: 'Completed', iconColor: '#C8FF00' },
      { id: 'tx_05', date: 'Oct 8, 2024', description: 'Patreon Subscriptions', platform: 'Patreon', type: 'Income', currency: 'USD', amount: 890, status: 'Completed', iconColor: '#FF424D' },
      { id: 'tx_04', date: 'Oct 9, 2024', description: 'USDC Deposit (Solana)', platform: 'Solana', type: 'Income', currency: 'USDC', amount: 2000, status: 'Completed', iconColor: '#9B5DE5' },
      { id: 'tx_03', date: 'Oct 8, 2024', description: 'Card Subscription', platform: 'Kre8trix Card', type: 'Expense', currency: 'USD', amount: -29, status: 'Completed', iconColor: '#9B5DE5' },
      { id: 'tx_02', date: 'Oct 7, 2024', description: 'Brand Sponsorship', platform: 'Stripe', type: 'Income', currency: 'USD', amount: 5000, status: 'Completed', iconColor: '#635BFF' },
      { id: 'tx_01', date: 'Oct 6, 2024', description: 'USD → USDC', platform: 'Kre8trix', type: 'Convert', currency: 'USDC', amount: 850, status: 'Completed', iconColor: '#C8FF00' },
    ],
    activeAdvances: [
      {
        id: 'KRA-2847',
        amount: 2500,
        fee: 62,
        feePercent: 2.5,
        repaid: 1125,
        total: 2562,
        issued: 'Sep 15, 2024',
        repaymentRate: '10% of monthly income',
        estCompletion: 'Nov 20',
        status: 'Active',
      },
    ],
    advanceHistory: [
      { id: 'KRA-2734', amount: 1000, fee: 25, feePercent: 2.5, repaid: 1025, total: 1025, issued: 'Jul 3, 2024', repaymentRate: '10% of monthly income', estCompletion: 'Sep 1', status: 'Repaid' },
      { id: 'KRA-2601', amount: 3500, fee: 87, feePercent: 2.5, repaid: 3587, total: 3587, issued: 'May 20, 2024', repaymentRate: '10% of monthly income', estCompletion: 'Aug 15', status: 'Repaid' },
      { id: 'KRA-2489', amount: 1500, fee: 37, feePercent: 2.5, repaid: 1537, total: 1537, issued: 'Mar 12, 2024', repaymentRate: '10% of monthly income', estCompletion: 'Jun 2', status: 'Repaid' },
    ],
    advanceUsed: 2500,
    connections: [
      { name: 'YouTube', user: 'Alex Creates', connected: true },
      { name: 'TikTok', user: '@alexcreates', connected: true },
      { name: 'Shopify', user: 'alexcreates.store', connected: true },
      { name: 'Stripe', user: 'alex@kre8trix.app', connected: false },
      { name: 'Patreon', user: '', connected: false },
    ],
    settings: {
      notifications: [
        { key: 'payment', label: 'Payment received', description: 'Get notified when you receive a payment', enabled: true },
        { key: 'advance', label: 'Advance due', description: 'Reminder before advance repayment', enabled: true },
        { key: 'score', label: 'Score changes', description: 'When your CCS score updates', enabled: true },
        { key: 'disconnect', label: 'Platform disconnect', description: 'If a connected platform loses sync', enabled: false },
        { key: 'marketing', label: 'Marketing emails', description: 'Product updates and tips', enabled: false },
      ],
      autoConvertUsdc: true,
      defaultPayoutWallet: 'USDC (Solana)',
    },
    reserve: {
      goal: 10000,
      current: 3400,
      monthlyTarget: 800,
      autoContribute: true,
    },
    notifications: seedNotifications(),
    txCounter: 13,
    advanceCounter: 2848,
    notifCounter: NOTIF_COUNTER_START,
    notifLastGeneratedAt: Date.now(),
  };
}

let cached: MockState | null = null;

export function getState(): MockState {
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw) as MockState;
      return cached;
    }
  } catch {
    /* corrupt storage — fall through to defaults */
  }
  cached = defaultState();
  return cached;
}

export function saveState() {
  if (!cached) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* storage unavailable (private mode quota etc.) — state stays in memory */
  }
}

export function resetState() {
  cached = defaultState();
  saveState();
}

/** Update state and persist in one step. */
export function mutate(fn: (state: MockState) => void) {
  const state = getState();
  fn(state);
  saveState();
}
