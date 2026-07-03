/**
 * Wallet domain module.
 *
 * Typed API functions for the Wallet page plus the mock handlers that serve
 * its data when `VITE_API_URL` is unset. Registering the handlers happens as
 * a side effect of importing this module (see src/lib/mock/registry.ts for
 * the pattern), so pages only need to import the functions below.
 *
 * The mock backend keeps mutable in-module state: POST /wallet/send and
 * POST /wallet/convert update the balances and prepend a ledger entry, so
 * subsequent GETs reflect the mutation for the rest of the session.
 */
import { ApiError, get, post } from '../api';
import { registerMockHandler } from '../mock/registry';
import type { Balance, Currency, Transaction } from './types';

/* ── Types ──────────────────────────────────────────────────────────── */

/** Body of POST /wallet/send. */
export interface SendRequest {
  /** Recipient address or username. */
  recipient: string;
  /** Positive amount to send in `currency` units. */
  amount: number;
  currency: Currency;
  /** Optional memo attached to the transfer. */
  note?: string;
}

/** Payload of POST /wallet/send — the debited balance and the new ledger entry. */
export interface SendResponse {
  balance: Balance;
  transaction: Transaction;
}

/** Body of POST /wallet/convert. */
export interface ConvertRequest {
  from: Currency;
  to: Currency;
  /** Positive amount to convert, in `from` units. */
  amount: number;
  /** Units of `to` received per unit of `from`, e.g. 1.0. */
  rate: number;
}

/** Payload of POST /wallet/convert — both updated balances and the ledger entry. */
export interface ConvertResponse {
  balances: Balance[];
  transaction: Transaction;
}

/* ── Mock state ─────────────────────────────────────────────────────── */

/** Mutable per-currency balances; sends and converts update these in place. */
const mockBalances: Record<Currency, number> = {
  USD: 24850.0,
  USDC: 12450.0,
};

/** Recent balance history per currency (oldest first). Mutations append. */
const mockSparklines: Record<Currency, number[]> = {
  USD: [22000, 22500, 23200, 22800, 23500, 24000, 23800, 24200, 24850],
  USDC: [4200, 5100, 5800, 6200, 7400, 8900, 10200, 11500, 12450],
};

/** Mutable ledger, newest first; sends and converts prepend entries. */
const mockTransactions: Transaction[] = [
  { id: '1', date: 'Oct 15, 2024', description: 'YouTube Ad Revenue', type: 'Income', currency: 'USD', amount: 4850.0, status: 'Completed' },
  { id: '2', date: 'Oct 15, 2024', description: 'USDC → USD', type: 'Convert', currency: 'USD', amount: 500.0, status: 'Completed' },
  { id: '3', date: 'Oct 14, 2024', description: 'TikTok Creator Fund', type: 'Income', currency: 'USD', amount: 1240.0, status: 'Completed' },
  { id: '4', date: 'Oct 13, 2024', description: 'Shopify Store Sales', type: 'Income', currency: 'USD', amount: 2180.0, status: 'Completed' },
  { id: '5', date: 'Oct 12, 2024', description: 'Equipment Purchase', type: 'Expense', currency: 'USD', amount: -1299.0, status: 'Completed' },
  { id: '6', date: 'Oct 12, 2024', description: 'USD → USDC', type: 'Convert', currency: 'USDC', amount: 850.0, status: 'Completed' },
  { id: '7', date: 'Oct 11, 2024', description: 'Advance Repayment', type: 'Expense', currency: 'USD', amount: -1850.0, status: 'Completed' },
  { id: '8', date: 'Oct 10, 2024', description: 'Stripe Payout', type: 'Income', currency: 'USD', amount: 3450.0, status: 'Pending' },
  { id: '9', date: 'Oct 10, 2024', description: 'Patreon Subscriptions', type: 'Income', currency: 'USD', amount: 890.0, status: 'Completed' },
  { id: '10', date: 'Oct 9, 2024', description: 'USDC Deposit (Solana)', type: 'Income', currency: 'USDC', amount: 2000.0, status: 'Completed' },
  { id: '11', date: 'Oct 8, 2024', description: 'Card Subscription', type: 'Expense', currency: 'USD', amount: -29.0, status: 'Completed' },
  { id: '12', date: 'Oct 7, 2024', description: 'Brand Sponsorship', type: 'Income', currency: 'USD', amount: 5000.0, status: 'Completed' },
];

let nextMockId = mockTransactions.length + 1;

/** Snapshots a currency's current mock balance as a `Balance` payload. */
function toBalance(currency: Currency): Balance {
  return {
    currency,
    amount: mockBalances[currency],
    sparkline: [...mockSparklines[currency]],
  };
}

/** Today's date as a ledger label, e.g. 'Oct 15, 2024'. */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Applies a signed delta to a mock balance and extends its sparkline. */
function applyDelta(currency: Currency, delta: number): void {
  mockBalances[currency] = Math.round((mockBalances[currency] + delta) * 100) / 100;
  mockSparklines[currency] = [...mockSparklines[currency].slice(1), mockBalances[currency]];
}

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/wallet/balances', () => [toBalance('USD'), toBalance('USDC')]);

registerMockHandler('GET', '/wallet/transactions', () => [...mockTransactions]);

registerMockHandler('POST', '/wallet/send', (_params, body) => {
  const { recipient, amount, currency, note } = (body ?? {}) as Partial<SendRequest>;
  if (!recipient || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !currency) {
    throw new ApiError(400, 'INVALID_REQUEST', 'A recipient, positive amount, and currency are required.');
  }
  if (amount > mockBalances[currency]) {
    throw new ApiError(
      400,
      'INSUFFICIENT_FUNDS',
      `Insufficient ${currency} balance: ${mockBalances[currency].toLocaleString('en-US', { minimumFractionDigits: 2 })} available.`,
    );
  }

  applyDelta(currency, -amount);
  const transaction: Transaction = {
    id: String(nextMockId++),
    date: todayLabel(),
    description: note ? `Sent to ${recipient} — ${note}` : `Sent to ${recipient}`,
    type: 'Expense',
    currency,
    amount: -amount,
    status: 'Completed',
  };
  mockTransactions.unshift(transaction);

  const response: SendResponse = { balance: toBalance(currency), transaction };
  return response;
});

registerMockHandler('POST', '/wallet/convert', (_params, body) => {
  const { from, to, amount, rate } = (body ?? {}) as Partial<ConvertRequest>;
  if (!from || !to || from === to || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Distinct from/to currencies and a positive amount are required.');
  }
  if (amount > mockBalances[from]) {
    throw new ApiError(
      400,
      'INSUFFICIENT_FUNDS',
      `Insufficient ${from} balance: ${mockBalances[from].toLocaleString('en-US', { minimumFractionDigits: 2 })} available.`,
    );
  }

  const received = Math.round(amount * (rate ?? 1) * 100) / 100;
  applyDelta(from, -amount);
  applyDelta(to, received);
  const transaction: Transaction = {
    id: String(nextMockId++),
    date: todayLabel(),
    description: `${from} → ${to}`,
    type: 'Convert',
    currency: to,
    amount: received,
    status: 'Completed',
  };
  mockTransactions.unshift(transaction);

  const response: ConvertResponse = { balances: [toBalance('USD'), toBalance('USDC')], transaction };
  return response;
});

/* ── API functions ──────────────────────────────────────────────────── */

/** GET /wallet/balances — current USD and USDC balances with sparklines. */
export function fetchWalletBalances(): Promise<Balance[]> {
  return get<Balance[]>('/wallet/balances');
}

/** GET /wallet/transactions — the wallet ledger, newest first. */
export function fetchWalletTransactions(): Promise<Transaction[]> {
  return get<Transaction[]>('/wallet/transactions');
}

/** POST /wallet/send — transfer funds; resolves with the updated balance. */
export function sendFunds(body: SendRequest): Promise<SendResponse> {
  return post<SendResponse>('/wallet/send', body);
}

/** POST /wallet/convert — swap between USD and USDC at the given rate. */
export function convertFunds(body: ConvertRequest): Promise<ConvertResponse> {
  return post<ConvertResponse>('/wallet/convert', body);
}
