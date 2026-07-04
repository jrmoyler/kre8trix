/*
 * Mock backend handlers. Registered against the api layer's mock
 * registry — active whenever VITE_API_URL is unset. Routes, payloads,
 * and responses mirror the intended real API so the UI does not change
 * when a server is introduced.
 */

import { ApiError, registerMock, type MockContext } from '../api';
import { getState, mutate } from './state';
/* C4: OAuth provider metadata shared with the consent screen UI. */
import { OAUTH_CLIENT_ID, OAUTH_PROVIDERS, OAUTH_REDIRECT_PATH } from '../oauth';
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
  OAuthDecisionPayload,
  OAuthDecisionResponse,
  OAuthPlatform,
  OAuthStartResponse,
  OAuthTokenPayload,
  OAuthTokenResponse,
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

/* ─────────────────────────── notifications ─────────────────────────── */

registerMock('GET', '/notifications', (ctx) => {
  requireAuth(ctx);
  return getState().notifications;
});

registerMock('POST', '/notifications/read-all', (ctx) => {
  requireAuth(ctx);
  mutate((s) => {
    s.notifications = s.notifications.map((n): AppNotification => ({ ...n, read: true }));
  });
  return getState().notifications;
});

/* ─────────────── C4: platform connect OAuth (mock provider) ───────────────
 *
 * Realistic OAuth 2.0 authorization-code flow against the mock backend:
 *   GET  /oauth/:platform/start      → authorize URL + CSRF state token
 *   POST /oauth/authorize/decision   → provider consent (Allow/Deny) mints
 *                                      a code or an access_denied redirect
 *   POST /oauth/token                → code exchange, marks connected
 */

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CODE_TTL_MS = 5 * 60 * 1000;

function randomToken(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function providerScope(platform: OAuthPlatform): string {
  return OAUTH_PROVIDERS[platform].scopes.map((s) => s.id).join(' ');
}

for (const provider of Object.values(OAUTH_PROVIDERS)) {
  registerMock('GET', `/oauth/${provider.slug}/start`, (ctx) => {
    requireAuth(ctx);
    const state = randomToken();
    mutate((s) => {
      // Prune expired pending authorizations while we're here.
      for (const [key, entry] of Object.entries(s.oauth.pending)) {
        if (Date.now() - entry.createdAt > OAUTH_STATE_TTL_MS) delete s.oauth.pending[key];
      }
      s.oauth.pending[state] = { platform: provider.slug, createdAt: Date.now() };
    });
    const params = new URLSearchParams({
      platform: provider.slug,
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_PATH,
      response_type: 'code',
      scope: providerScope(provider.slug),
      state,
    });
    const response: OAuthStartResponse = {
      platform: provider.slug,
      authorizeUrl: `/oauth/authorize?${params.toString()}`,
      state,
    };
    return response;
  });
}

registerMock('POST', '/oauth/authorize/decision', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as OAuthDecisionPayload;
  if (!body?.state) throw new ApiError(400, 'invalid_request: missing state parameter');
  if (body.decision !== 'allow' && body.decision !== 'deny') {
    throw new ApiError(400, 'invalid_request: decision must be "allow" or "deny"');
  }
  const pending = getState().oauth.pending[body.state];
  if (!pending || Date.now() - pending.createdAt > OAUTH_STATE_TTL_MS) {
    throw new ApiError(400, 'invalid_request: unknown or expired state token — restart the connect flow');
  }

  if (body.decision === 'deny') {
    mutate((s) => {
      delete s.oauth.pending[body.state];
    });
    const params = new URLSearchParams({ error: 'access_denied', state: body.state });
    const response: OAuthDecisionResponse = {
      redirect: `${OAUTH_REDIRECT_PATH}?${params.toString()}`,
    };
    return response;
  }

  const code = `mock_${randomToken(24)}`;
  mutate((s) => {
    delete s.oauth.pending[body.state];
    // Prune expired/used codes while we're here.
    for (const [key, grant] of Object.entries(s.oauth.codes)) {
      if (grant.used || Date.now() - grant.createdAt > OAUTH_CODE_TTL_MS) delete s.oauth.codes[key];
    }
    s.oauth.codes[code] = {
      platform: pending.platform,
      state: body.state,
      createdAt: Date.now(),
      used: false,
    };
  });
  const params = new URLSearchParams({ code, state: body.state });
  const response: OAuthDecisionResponse = {
    redirect: `${OAUTH_REDIRECT_PATH}?${params.toString()}`,
  };
  return response;
});

registerMock('POST', '/oauth/token', (ctx) => {
  requireAuth(ctx);
  const body = ctx.body as OAuthTokenPayload;
  if (body?.grant_type !== 'authorization_code') {
    throw new ApiError(400, 'unsupported_grant_type: expected "authorization_code"');
  }
  if (!body.code) throw new ApiError(400, 'invalid_request: missing authorization code');
  if (body.client_id !== OAUTH_CLIENT_ID) {
    throw new ApiError(401, 'invalid_client: unknown client_id');
  }
  if (body.redirect_uri !== OAUTH_REDIRECT_PATH) {
    throw new ApiError(400, 'invalid_grant: redirect_uri does not match the authorization request');
  }

  const grant = getState().oauth.codes[body.code];
  if (!grant || grant.used) {
    throw new ApiError(400, 'invalid_grant: authorization code is unknown or was already used');
  }
  if (Date.now() - grant.createdAt > OAUTH_CODE_TTL_MS) {
    throw new ApiError(400, 'invalid_grant: authorization code expired — restart the connect flow');
  }

  const provider = OAUTH_PROVIDERS[grant.platform as OAuthPlatform];
  mutate((s) => {
    s.oauth.codes[body.code].used = true;
    const connection = s.connections.find((c) => c.name === provider.name);
    if (connection) {
      connection.connected = true;
      if (!connection.user) connection.user = s.profile.handle;
    } else {
      s.connections.push({ name: provider.name, user: s.profile.handle, connected: true });
    }
  });

  const response: OAuthTokenResponse = {
    access_token: `mock_at_${randomToken(24)}`,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: `mock_rt_${randomToken(24)}`,
    scope: providerScope(provider.slug),
    platform: provider.slug,
    connections: getState().connections,
  };
  return response;
});
