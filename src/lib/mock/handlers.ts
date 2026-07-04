/*
 * Mock backend handlers. Registered against the api layer's mock
 * registry — active whenever VITE_API_URL is unset. Routes, payloads,
 * and responses mirror the intended real API so the UI does not change
 * when a server is introduced.
 */

import { ApiError, registerMock, type MockContext } from '../api';
import { getState, mutate, NOTIF_COUNTER_START, seedNotifications } from './state';
import type {
  AdvancesOverview,
  AppNotification,
  AppSettings,
  AuthResponse,
  CashFlowForecast,
  CcsScore,
  CcsSimulationRequest,
  CcsSimulationResult,
  ConvertPayload,
  ForecastPoint,
  ForecastSummaryItem,
  ForecastWindow,
  PlatformConnection,
  PlatformRevenueSummary,
  Profile,
  ReserveBuilder,
  SeasonalityMonth,
  SendPayload,
  TaxTracker,
  User,
  WalletBalances,
  WalletMutationResponse,
  WalletTransaction,
} from '../types';

/* ─────────────────────────── helpers ─────────────────────────── */

function requireAuth(ctx: MockContext) {
  if (!ctx.token) throw new ApiError(401, 'Not authenticated');
}

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Unsigned mock JWT — structurally valid so real JWT tooling can decode it. */
function issueMockJwt(user: User): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }),
  );
  return `${header}.${payload}.mock-signature`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─────────────────────────── auth ─────────────────────────── */

registerMock('POST', '/auth/login', (ctx) => {
  const body = ctx.body as { email?: string; password?: string };
  if (!body?.email || !body.email.includes('@')) {
    throw new ApiError(400, 'Enter a valid email address');
  }
  if (!body?.password || body.password.length < 6) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const { user } = getState();
  const response: AuthResponse = { token: issueMockJwt(user), user };
  return response;
});

registerMock('POST', '/auth/signup', (ctx) => {
  const body = ctx.body as { name?: string; email?: string; password?: string };
  if (!body?.name?.trim()) throw new ApiError(400, 'Name is required');
  if (!body?.email || !body.email.includes('@')) {
    throw new ApiError(400, 'Enter a valid email address');
  }
  if (!body?.password || body.password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  mutate((state) => {
    state.user = {
      ...state.user,
      name: body.name!.trim(),
      email: body.email!.trim(),
      handle: `@${body.name!.trim().toLowerCase().replace(/\s+/g, '')}`,
    };
    state.profile = {
      ...state.profile,
      name: state.user.name,
      email: state.user.email,
      handle: state.user.handle,
    };
  });
  const { user } = getState();
  const response: AuthResponse = { token: issueMockJwt(user), user };
  return response;
});

registerMock('GET', '/auth/me', (ctx) => {
  requireAuth(ctx);
  return getState().user;
});

/* ─────────────────────────── wallet ─────────────────────────── */

function balancesSnapshot(): WalletBalances {
  const { balances } = getState();
  return {
    usd: balances.usd,
    usdc: balances.usdc,
    usdSparkline: [22000, 22500, 23200, 22800, 23500, 24000, 23800, 24200, balances.usd],
    usdcSparkline: [4200, 5100, 5800, 6200, 7400, 8900, 10200, 11500, balances.usdc],
  };
}

registerMock('GET', '/wallet/balances', (ctx) => {
  requireAuth(ctx);
  return balancesSnapshot();
});

registerMock('GET', '/wallet/transactions', (ctx) => {
  requireAuth(ctx);
  const { transactions } = getState();
  const { currency, limit } = ctx.query;
  let result = transactions;
  if (currency === 'USD' || currency === 'USDC') {
    result = result.filter((t) => t.currency === currency);
  }
  if (limit) result = result.slice(0, Number(limit));
  return result;
});

registerMock('POST', '/wallet/send', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as SendPayload;
  if (!body?.recipient?.trim()) throw new ApiError(400, 'Recipient is required');
  if (!body.amount || body.amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  const state = getState();
  const available = body.currency === 'USD' ? state.balances.usd : state.balances.usdc;
  if (body.amount > available) {
    throw new ApiError(400, `Insufficient ${body.currency} balance`);
  }

  let transaction: WalletTransaction | undefined;
  mutate((s) => {
    if (body.currency === 'USD') s.balances.usd -= body.amount;
    else s.balances.usdc -= body.amount;
    transaction = {
      id: `tx_${s.txCounter++}`,
      date: todayLabel(),
      description: `Sent to ${body.recipient.trim()}`,
      platform: 'Kre8trix',
      type: 'Send',
      currency: body.currency,
      amount: -body.amount,
      status: 'Completed',
      iconColor: '#C8FF00',
    };
    s.transactions.unshift(transaction);
  });

  const response: WalletMutationResponse = { transaction: transaction!, balances: balancesSnapshot() };
  return response;
});

registerMock('POST', '/wallet/request', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as SendPayload;
  if (!body?.recipient?.trim()) throw new ApiError(400, 'Enter who to request from');
  if (!body.amount || body.amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  let transaction: WalletTransaction | undefined;
  mutate((s) => {
    transaction = {
      id: `tx_${s.txCounter++}`,
      date: todayLabel(),
      description: `Requested from ${body.recipient.trim()}`,
      platform: 'Kre8trix',
      type: 'Request',
      currency: body.currency,
      amount: body.amount,
      status: 'Pending',
      iconColor: '#00D4FF',
    };
    s.transactions.unshift(transaction);
  });

  const response: WalletMutationResponse = { transaction: transaction!, balances: balancesSnapshot() };
  return response;
});

registerMock('POST', '/wallet/convert', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as ConvertPayload;
  if (!body?.amount || body.amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  const state = getState();
  const available = body.from === 'USD' ? state.balances.usd : state.balances.usdc;
  if (body.amount > available) {
    throw new ApiError(400, `Insufficient ${body.from} balance`);
  }

  let transaction: WalletTransaction | undefined;
  mutate((s) => {
    if (body.from === 'USD') {
      s.balances.usd -= body.amount;
      s.balances.usdc += body.amount;
    } else {
      s.balances.usdc -= body.amount;
      s.balances.usd += body.amount;
    }
    const to = body.from === 'USD' ? 'USDC' : 'USD';
    transaction = {
      id: `tx_${s.txCounter++}`,
      date: todayLabel(),
      description: `${body.from} → ${to}`,
      platform: 'Kre8trix',
      type: 'Convert',
      currency: to,
      amount: body.amount,
      status: 'Completed',
      iconColor: '#C8FF00',
    };
    s.transactions.unshift(transaction);
  });

  const response: WalletMutationResponse = { transaction: transaction!, balances: balancesSnapshot() };
  return response;
});

/* ─────────────────────────── platform revenue ─────────────────────────── */

registerMock('GET', '/revenue/platforms', (ctx) => {
  requireAuth(ctx);
  const platforms = [
    { platform: 'YouTube', amount: 4850, color: '#FF0000' },
    { platform: 'Stripe', amount: 3450, color: '#635BFF' },
    { platform: 'Shopify', amount: 2180, color: '#96BF48' },
    { platform: 'TikTok', amount: 1240, color: '#FF0050' },
    { platform: 'Patreon', amount: 890, color: '#FF424D' },
  ];
  const response: PlatformRevenueSummary = {
    platforms,
    total: platforms.reduce((sum, p) => sum + p.amount, 0),
    changePercent: 12,
  };
  return response;
});

/* ─────────────────────────── cash flow ─────────────────────────── */

const FORECAST_SUMMARY: ForecastSummaryItem[] = [
  { window: '30D', label: '30-Day', amount: 18400, color: '#00D4FF' },
  { window: '60D', label: '60-Day', amount: 31200, color: '#C8FF00' },
  { window: '90D', label: '90-Day', amount: 44800, color: '#9B5DE5' },
];

const FORECAST_CONFIG: Record<
  ForecastWindow,
  { points: number; actualShare: number; start: number; end: number; bandPercent: number; confidence: number }
> = {
  '30D': { points: 16, actualShare: 0.55, start: 8200, end: 18400, bandPercent: 0.1, confidence: 92 },
  '60D': { points: 20, actualShare: 0.45, start: 8200, end: 31200, bandPercent: 0.16, confidence: 84 },
  '90D': { points: 24, actualShare: 0.38, start: 8200, end: 44800, bandPercent: 0.24, confidence: 71 },
};

function buildForecast(window: ForecastWindow): CashFlowForecast {
  const config = FORECAST_CONFIG[window];
  const totalDays = window === '30D' ? 30 : window === '60D' ? 60 : 90;
  const now = new Date();
  const historyDays = Math.round(totalDays * config.actualShare);
  const firstDay = new Date(now);
  firstDay.setDate(now.getDate() - historyDays);

  const points: ForecastPoint[] = [];
  for (let i = 0; i < config.points; i++) {
    const t = i / (config.points - 1);
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + Math.round(t * totalDays));
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Smooth growth curve with a seasonal wobble; deterministic per index.
    const base = config.start + (config.end - config.start) * t;
    const wobble = Math.sin(i * 1.4) * (config.end - config.start) * 0.035;
    const value = Math.round(base + wobble);

    const isProjected = t * totalDays > historyDays;
    // Confidence band widens further into the future.
    const bandWidth = value * config.bandPercent * Math.min(1, (t * totalDays - historyDays) / (totalDays - historyDays || 1) + 0.25);
    points.push({
      label,
      actual: isProjected ? null : value,
      projected: isProjected ? value : null,
      low: isProjected ? Math.round(value - bandWidth) : null,
      high: isProjected ? Math.round(value + bandWidth) : null,
    });
  }

  // Bridge the actual/projected series so the chart lines connect.
  const lastActualIdx = points.reduce((acc, p, i) => (p.actual !== null ? i : acc), -1);
  if (lastActualIdx >= 0 && lastActualIdx < points.length - 1) {
    points[lastActualIdx].projected = points[lastActualIdx].actual;
    points[lastActualIdx].low = points[lastActualIdx].actual;
    points[lastActualIdx].high = points[lastActualIdx].actual;
  }

  return { window, points, summary: FORECAST_SUMMARY, confidencePercent: config.confidence };
}

registerMock('GET', '/cashflow/forecast', (ctx) => {
  requireAuth(ctx);
  const window = (ctx.query.window as ForecastWindow) || '30D';
  if (!['30D', '60D', '90D'].includes(window)) {
    throw new ApiError(400, `Unknown forecast window: ${window}`);
  }
  return buildForecast(window);
});

registerMock('GET', '/cashflow/seasonality', (ctx) => {
  requireAuth(ctx);
  const months: SeasonalityMonth[] = [
    { month: 'Jan', index: 82 },
    { month: 'Feb', index: 78 },
    { month: 'Mar', index: 95 },
    { month: 'Apr', index: 101 },
    { month: 'May', index: 108 },
    { month: 'Jun', index: 112 },
    { month: 'Jul', index: 104 },
    { month: 'Aug', index: 98 },
    { month: 'Sep', index: 106 },
    { month: 'Oct', index: 91 },
    { month: 'Nov', index: 124 },
    { month: 'Dec', index: 131 },
  ];
  return months;
});

registerMock('GET', '/cashflow/tax', (ctx) => {
  requireAuth(ctx);
  const tracker: TaxTracker = {
    ytdIncome: 94300,
    estimatedRatePercent: 24,
    estimatedOwed: 22632,
    setAside: 15800,
    nextDeadline: 'Jan 15, 2027',
  };
  return tracker;
});

registerMock('GET', '/cashflow/reserve', (ctx) => {
  requireAuth(ctx);
  return getState().reserve;
});

registerMock('PUT', '/cashflow/reserve', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as Partial<ReserveBuilder>;
  mutate((s) => {
    s.reserve = { ...s.reserve, ...body };
  });
  return getState().reserve;
});

/* ─────────────────────────── CCS score ─────────────────────────── */

const CCS_SIGNALS = [
  { name: 'Income Consistency', weight: 22, score: 720, color: '#C8FF00' },
  { name: 'Monetization Diversification', weight: 18, score: 580, color: '#00D4FF' },
  { name: 'Audience Durability', weight: 17, score: 640, color: '#9B5DE5' },
  { name: 'Financial Behavior', weight: 16, score: 510, color: '#FF4D00' },
  { name: 'Platform Risk', weight: 13, score: 680, color: '#FF4D4D' },
  { name: 'Business Maturity', weight: 10, score: 490, color: '#FFD400' },
  { name: 'Growth Trajectory', weight: 4, score: 620, color: '#00E5A0' },
];

function tierForScore(score: number): string {
  if (score >= 750) return 'Prime';
  if (score >= 650) return 'Stable';
  if (score >= 500) return 'Rising';
  return 'Emerging';
}

function weightedScore(signalScores: Record<string, number>): number {
  const totalWeight = CCS_SIGNALS.reduce((sum, s) => sum + s.weight, 0);
  const weighted = CCS_SIGNALS.reduce(
    (sum, s) => sum + (signalScores[s.name] ?? s.score) * s.weight,
    0,
  );
  return Math.round(weighted / totalWeight);
}

registerMock('GET', '/ccs/score', (ctx) => {
  requireAuth(ctx);
  const score: CcsScore = {
    score: 612,
    maxScore: 850,
    tier: 'Rising',
    percentile: 34,
    quarterDelta: 47,
    history: [
      { month: 'May', score: 550 },
      { month: 'Jun', score: 565 },
      { month: 'Jul', score: 558 },
      { month: 'Aug', score: 578 },
      { month: 'Sep', score: 595 },
      { month: 'Oct', score: 612 },
    ],
    signals: CCS_SIGNALS,
  };
  return score;
});

registerMock('POST', '/ccs/simulate', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as CcsSimulationRequest;
  const adjustments = body?.adjustments ?? {};
  for (const [name, value] of Object.entries(adjustments)) {
    if (!CCS_SIGNALS.some((s) => s.name === name)) {
      throw new ApiError(400, `Unknown signal: ${name}`);
    }
    if (value < 300 || value > 850) {
      throw new ApiError(400, 'Signal scores must be between 300 and 850');
    }
  }
  const baseline = weightedScore({});
  const projected = weightedScore(adjustments);
  // The published score (612) differs from the raw weighted mean; apply the same offset.
  const offset = 612 - baseline;
  const projectedScore = Math.max(300, Math.min(850, projected + offset));
  const result: CcsSimulationResult = {
    projectedScore,
    delta: projectedScore - 612,
    projectedTier: tierForScore(projectedScore),
  };
  return result;
});

/* ─────────────────────────── advances ─────────────────────────── */

const ADVANCE_MAX = 5000;
const ADVANCE_FEE_PERCENT = 2.5;

function advancesOverview(): AdvancesOverview {
  const state = getState();
  const available = Math.max(0, ADVANCE_MAX - state.advanceUsed);
  return {
    eligibility: {
      eligible: available > 0,
      maxAmount: ADVANCE_MAX,
      used: state.advanceUsed,
      available,
      feePercent: ADVANCE_FEE_PERCENT,
      ccsScore: 612,
      tier: 'Rising',
    },
    active: state.activeAdvances,
    history: [...state.activeAdvances, ...state.advanceHistory],
  };
}

registerMock('GET', '/advances', (ctx) => {
  requireAuth(ctx);
  return advancesOverview();
});

registerMock('POST', '/advances/apply', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as { amount?: number };
  const amount = body?.amount ?? 0;
  if (amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  const state = getState();
  const available = ADVANCE_MAX - state.advanceUsed;
  if (amount > available) {
    throw new ApiError(400, `Amount exceeds your available limit of $${available.toLocaleString()}`);
  }

  mutate((s) => {
    const fee = Math.round(amount * (ADVANCE_FEE_PERCENT / 100) * 100) / 100;
    const advance = {
      id: `KRA-${s.advanceCounter++}`,
      amount,
      fee,
      feePercent: ADVANCE_FEE_PERCENT,
      repaid: 0,
      total: amount + fee,
      issued: todayLabel(),
      repaymentRate: '10% of monthly income',
      estCompletion: 'TBD',
      status: 'Active' as const,
    };
    s.activeAdvances.unshift(advance);
    s.advanceUsed += amount;
    s.balances.usd += amount;
    s.transactions.unshift({
      id: `tx_${s.txCounter++}`,
      date: todayLabel(),
      description: `Advance ${advance.id} disbursed`,
      platform: 'Kre8trix',
      type: 'Income',
      currency: 'USD',
      amount,
      status: 'Completed',
      iconColor: '#FF4D00',
    });
  });

  return advancesOverview();
});

/* ─────────────────────────── profile & settings ─────────────────────────── */

registerMock('GET', '/profile', (ctx) => {
  requireAuth(ctx);
  return getState().profile;
});

registerMock('PUT', '/profile', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as Partial<Profile>;
  if (body.email !== undefined && !body.email.includes('@')) {
    throw new ApiError(400, 'Enter a valid email address');
  }
  mutate((s) => {
    s.profile = { ...s.profile, ...body };
    s.user = { ...s.user, name: s.profile.name, email: s.profile.email, handle: s.profile.handle };
  });
  return getState().profile;
});

registerMock('GET', '/profile/connections', (ctx) => {
  requireAuth(ctx);
  return getState().connections;
});

registerMock('PUT', '/profile/connections', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as { name?: string; connected?: boolean };
  if (!body?.name) throw new ApiError(400, 'Platform name is required');
  const state = getState();
  const target = state.connections.find((c) => c.name === body.name);
  if (!target) throw new ApiError(404, `Unknown platform: ${body.name}`);
  mutate((s) => {
    const connection = s.connections.find((c) => c.name === body.name) as PlatformConnection;
    connection.connected = body.connected ?? !connection.connected;
    if (connection.connected && !connection.user) {
      connection.user = s.profile.handle;
    }
  });
  return getState().connections;
});

registerMock('GET', '/settings', (ctx) => {
  requireAuth(ctx);
  return getState().settings;
});

registerMock('PUT', '/settings', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as Partial<AppSettings>;
  mutate((s) => {
    s.settings = { ...s.settings, ...body };
  });
  return getState().settings;
});

/* ─────────────────────────── notifications (C5) ─────────────────────────── */

const NOTIFICATION_TEMPLATES: Array<Pick<AppNotification, 'type' | 'title' | 'body' | 'actionPath'>> = [
  { type: 'payment', title: 'Payout received', body: 'Stripe payout of $1,240 landed in your USD balance.', actionPath: '/wallet?action=history' },
  { type: 'payment', title: 'TikTok Creator Fund', body: 'A $312 Creator Fund payment just cleared.', actionPath: '/wallet?action=history' },
  { type: 'advance', title: 'Advance approved', body: 'You are pre-approved for up to $2,500 at 2.5% flat.', actionPath: '/advances' },
  { type: 'advance', title: 'Repayment processed', body: '$212 auto-deducted toward advance KRA-2847.', actionPath: '/advances' },
  { type: 'ccs', title: 'CCS signal improved', body: 'Income Consistency ticked up — your score may follow.', actionPath: '/credit-score' },
  { type: 'tax', title: 'Tax reserve nudge', body: 'You are $340 behind this month’s set-aside target.', actionPath: '/cash-flow' },
  // Merge note: point at /marketplace once the brand-deal marketplace route lands.
  { type: 'platform', title: 'New brand deal match', body: 'A sponsor is looking for creators in your niche.', actionPath: '/dashboard' },
  { type: 'platform', title: 'Platform sync complete', body: 'YouTube revenue re-synced — figures are up to date.', actionPath: '/settings' },
  { type: 'system', title: 'Weekly digest ready', body: 'Your creator finance summary for the week is in.', actionPath: '/dashboard' },
];

const NOTIF_GENERATION_MIN_GAP_MS = 90_000;
const NOTIF_GENERATION_CHANCE = 0.5;
const NOTIF_MAX_STORED = 30;

/** Sessions cached before C5 hold notifications without type/createdAt — re-seed them. */
function ensureNotificationShape() {
  const { notifications } = getState();
  const legacy = notifications.some(
    (n) => typeof (n as { type?: unknown }).type !== 'string' || typeof (n as { createdAt?: unknown }).createdAt !== 'string',
  );
  if (!legacy) return;
  mutate((s) => {
    s.notifications = seedNotifications();
    s.notifCounter = NOTIF_COUNTER_START;
    s.notifLastGeneratedAt = Date.now();
  });
}

/** Occasionally emit a fresh mock notification so polling has something to find. */
function maybeGenerateNotification() {
  const state = getState();
  const last = state.notifLastGeneratedAt ?? 0;
  if (last === 0) {
    mutate((s) => {
      s.notifLastGeneratedAt = Date.now();
    });
    return;
  }
  if (Date.now() - last < NOTIF_GENERATION_MIN_GAP_MS) return;
  if (Math.random() >= NOTIF_GENERATION_CHANCE) return;
  mutate((s) => {
    const template = NOTIFICATION_TEMPLATES[Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)];
    const nextId = s.notifCounter ?? 100;
    s.notifCounter = nextId + 1;
    s.notifications.unshift({
      ...template,
      id: `ntf_${nextId}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    if (s.notifications.length > NOTIF_MAX_STORED) s.notifications.length = NOTIF_MAX_STORED;
    s.notifLastGeneratedAt = Date.now();
  });
}

/** Newest-first copy of the stored notifications. */
function notificationsSnapshot(): AppNotification[] {
  return [...getState().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function setNotificationRead(id: string, read: boolean): AppNotification[] {
  const { notifications } = getState();
  if (!notifications.some((n) => n.id === id)) {
    throw new ApiError(404, `Unknown notification: ${id}`);
  }
  mutate((s) => {
    s.notifications = s.notifications.map((n): AppNotification => (n.id === id ? { ...n, read } : n));
  });
  return notificationsSnapshot();
}

registerMock('GET', '/notifications', (ctx) => {
  requireAuth(ctx);
  ensureNotificationShape();
  maybeGenerateNotification();
  return notificationsSnapshot();
});

registerMock('POST', '/notifications/read-all', (ctx) => {
  requireAuth(ctx);
  ensureNotificationShape();
  mutate((s) => {
    s.notifications = s.notifications.map((n): AppNotification => ({ ...n, read: true }));
  });
  return notificationsSnapshot();
});

registerMock('POST', '/notifications/:id/read', (ctx) => {
  requireAuth(ctx);
  ensureNotificationShape();
  return setNotificationRead(ctx.params.id, true);
});

registerMock('POST', '/notifications/:id/unread', (ctx) => {
  requireAuth(ctx);
  ensureNotificationShape();
  return setNotificationRead(ctx.params.id, false);
});
