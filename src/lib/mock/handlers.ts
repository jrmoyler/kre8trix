/*
 * Mock backend handlers. Registered against the api layer's mock
 * registry — active whenever VITE_API_URL is unset. Routes, payloads,
 * and responses mirror the intended real API so the UI does not change
 * when a server is introduced.
 */

import { ApiError, registerMock, type MockContext } from '../api';
import { ensureCreatorState, getState, mutate, SELF_WALLET_ADDRESS } from './state';
import { SOLANA_ADDRESS_RE } from '../types';
import type {
  AdvancesOverview,
  AppNotification,
  AppSettings,
  AuthResponse,
  BrandDeal,
  CashFlowForecast,
  CcsScore,
  CcsSimulationRequest,
  CcsSimulationResult,
  ConvertPayload,
  Creator,
  DealApplication,
  DealApplyResponse,
  ForecastPoint,
  ForecastSummaryItem,
  ForecastWindow,
  PlatformConnection,
  PlatformRevenueSummary,
  Profile,
  RecentRecipient,
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
  ensureCreatorState();
  const body = ctx.body as SendPayload;
  if (!body?.recipient?.trim()) throw new ApiError(400, 'Recipient is required');
  if (!body.amount || body.amount <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  const state = getState();
  const recipientRaw = body.recipient.trim();

  /* C1: self-send guard — by own handle or own wallet address */
  if (
    recipientRaw.toLowerCase() === state.user.handle.toLowerCase() ||
    recipientRaw === SELF_WALLET_ADDRESS
  ) {
    throw new ApiError(400, "You can't send funds to yourself");
  }

  /* C1: resolve @handles to a known creator; match raw addresses too */
  let creator: Creator | undefined;
  if (recipientRaw.startsWith('@')) {
    creator = state.creators.find((c) => c.handle.toLowerCase() === recipientRaw.toLowerCase());
    if (!creator) throw new ApiError(404, `No creator found with handle ${recipientRaw}`);
  } else {
    creator = state.creators.find((c) => c.walletAddress === recipientRaw);
    if (!creator && body.currency === 'USDC' && !SOLANA_ADDRESS_RE.test(recipientRaw)) {
      throw new ApiError(400, 'Invalid Solana wallet address (base58, 32-44 characters)');
    }
  }

  const available = body.currency === 'USD' ? state.balances.usd : state.balances.usdc;
  if (body.amount > available) {
    throw new ApiError(400, `Insufficient ${body.currency} balance`);
  }

  const resolvedAddress = creator?.walletAddress ?? recipientRaw;
  const displayName = creator
    ? creator.handle
    : SOLANA_ADDRESS_RE.test(recipientRaw)
      ? shortenAddress(recipientRaw)
      : recipientRaw;

  let transaction: WalletTransaction | undefined;
  mutate((s) => {
    if (body.currency === 'USD') s.balances.usd -= body.amount;
    else s.balances.usdc -= body.amount;
    transaction = {
      id: `tx_${s.txCounter++}`,
      date: todayLabel(),
      description: `Sent to ${displayName}`,
      platform: 'Kre8trix',
      type: 'Send',
      currency: body.currency,
      amount: -body.amount,
      status: 'Completed',
      iconColor: '#C8FF00',
      /* C1: record who the money went to */
      recipientHandle: creator?.handle,
      recipientAddress:
        creator !== undefined || SOLANA_ADDRESS_RE.test(recipientRaw) ? resolvedAddress : undefined,
    };
    s.transactions.unshift(transaction);

    /* C1: feed the "Recent recipients" row (dedupe by address, cap 6) */
    if (creator || SOLANA_ADDRESS_RE.test(recipientRaw)) {
      const entry: RecentRecipient = {
        id: `rcp_${resolvedAddress.slice(0, 8)}`,
        handle: creator?.handle ?? null,
        displayName: creator?.displayName ?? shortenAddress(recipientRaw),
        walletAddress: resolvedAddress,
        lastSentAt: todayLabel(),
      };
      s.recentRecipients = [
        entry,
        ...s.recentRecipients.filter((r) => r.walletAddress !== resolvedAddress),
      ].slice(0, 6);
    }
  });

  const response: WalletMutationResponse = { transaction: transaction!, balances: balancesSnapshot() };
  return response;
});

/* ── C1: creator-to-creator payments ───────────────────────────── */

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

registerMock('GET', '/creators/search', (ctx) => {
  requireAuth(ctx);
  ensureCreatorState();
  const q = (ctx.query.q ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!q) return [] as Creator[];
  const { creators } = getState();
  return creators
    .filter(
      (c) =>
        c.handle.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q),
    )
    .slice(0, 6);
});

registerMock('GET', '/wallet/recipients', (ctx) => {
  requireAuth(ctx);
  ensureCreatorState();
  return getState().recentRecipients.slice(0, 6);
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

/* ─────────────────── C2: brand deal marketplace ─────────────────── */

/** Deal catalog is static; per-user application state lives in mock state. */
const MARKETPLACE_DEALS: Omit<BrandDeal, 'applied'>[] = [
  {
    id: 'deal_01',
    brand: 'Lumen Audio',
    brandColor: '#C8FF00',
    brandAbout: 'Berlin-based maker of studio-grade wireless headphones and creator monitors, shipping to 40+ countries.',
    category: 'Tech',
    tagline: 'Launch campaign for the Lumen One ANC headphones',
    payoutMin: 2500,
    payoutMax: 4000,
    deliverables: ['1 dedicated YouTube integration (60-90s)', '2 TikTok clips', '1 Instagram story set'],
    requirements: ['50K+ subscribers on primary platform', 'Tech or lifestyle content focus', 'Draft for brand review 7 days before publish', '30-day exclusivity vs. competing audio brands'],
    payoutTerms: '50% on contract signing, 50% within 15 days of final deliverable. Performance bonus of $500 at 250K combined views.',
    deadline: '2026-07-24',
    matchScore: 91,
  },
  {
    id: 'deal_02',
    brand: 'VoltWear',
    brandColor: '#FF4D00',
    brandAbout: 'Streetwear label blending reflective techwear fabrics with skate culture. Sold in 200+ boutiques.',
    category: 'Fashion',
    tagline: 'Fall drop lookbook + haul collaboration',
    payoutMin: 1200,
    payoutMax: 2200,
    deliverables: ['1 haul/lookbook video', '3 Instagram feed posts', 'Discount code promotion for 30 days'],
    requirements: ['Fashion or lifestyle niche', 'US/EU audience majority', 'Wardrobe items returned or purchased at 60% off'],
    payoutTerms: 'Net-30 after final deliverable, plus 8% commission on tracked code sales.',
    deadline: '2026-08-10',
    matchScore: 68,
  },
  {
    id: 'deal_03',
    brand: 'PixelForge Games',
    brandColor: '#9B5DE5',
    brandAbout: 'Indie studio behind the roguelite hit "Emberfall" — 2M copies sold. Publishing 4 new titles this year.',
    category: 'Gaming',
    tagline: 'Sponsored playthrough of the Emberfall: Ashes DLC',
    payoutMin: 3000,
    payoutMax: 6500,
    deliverables: ['1 sponsored stream (2h minimum)', '1 YouTube highlights video', 'Launch-day social post'],
    requirements: ['Gaming content with 20K+ avg. views', 'Stream on launch week', 'Disclose sponsorship per FTC guidelines'],
    payoutTerms: 'Flat fee tiered by average concurrent viewers, paid within 10 days of the stream. Key + DLC provided.',
    deadline: '2026-07-18',
    matchScore: 84,
  },
  {
    id: 'deal_04',
    brand: 'NordShield VPN',
    brandColor: '#4687FF',
    brandAbout: 'Privacy company with 14M users, consistently top-rated for speed and independent security audits.',
    category: 'Tech',
    tagline: 'Always-on privacy — quarterly ambassador program',
    payoutMin: 4500,
    payoutMax: 8000,
    deliverables: ['3 YouTube pre-roll integrations (45-60s)', '1 dedicated short', 'Custom landing page promotion'],
    requirements: ['100K+ subscribers', 'Prior sponsored-content experience', 'Quarterly commitment (3 videos)', 'No competing VPN promos during term'],
    payoutTerms: 'Fixed fee per integration paid net-15, plus $8 CPA on conversions through your link.',
    deadline: '2026-08-02',
    matchScore: 88,
  },
  {
    id: 'deal_05',
    brand: 'GlowTheory',
    brandColor: '#FF4D9E',
    brandAbout: 'Clean-formula skincare brand built around dermatologist-reviewed routines for screen-heavy lifestyles.',
    category: 'Beauty',
    tagline: 'Summer SPF line — honest review series',
    payoutMin: 900,
    payoutMax: 1800,
    deliverables: ['1 GRWM or routine video', '2 TikTok/Reels', 'Link-in-bio placement for 2 weeks'],
    requirements: ['Beauty, wellness, or lifestyle niche', '60%+ audience aged 18-34', 'Products used on camera for 14+ days before review'],
    payoutTerms: 'Full payment net-20 after deliverables; PR kit (~$240 value) yours to keep.',
    deadline: '2026-07-30',
    matchScore: 54,
  },
  {
    id: 'deal_06',
    brand: 'IronPulse Fitness',
    brandColor: '#00E5A0',
    brandAbout: 'Connected home-gym platform — smart resistance equipment plus live coaching for 300K members.',
    category: 'Fitness',
    tagline: '30-day transformation challenge partnership',
    payoutMin: 2000,
    payoutMax: 3600,
    deliverables: ['4 weekly progress videos', '1 dedicated equipment review', 'Challenge hashtag promotion'],
    requirements: ['Fitness or self-improvement content', 'Document the full 30-day program', 'Equipment loan agreement (returned or bought out after)'],
    payoutTerms: 'Paid in two installments: 40% at challenge midpoint, 60% on completion.',
    deadline: '2026-08-22',
    matchScore: 77,
  },
  {
    id: 'deal_07',
    brand: 'Brewline Coffee',
    brandColor: '#B4693C',
    brandAbout: 'Specialty roaster shipping single-origin subscriptions nationwide; B-Corp certified since 2023.',
    category: 'Food',
    tagline: 'Morning-routine subscription box feature',
    payoutMin: 600,
    payoutMax: 1200,
    deliverables: ['1 morning routine integration', '1 Instagram story with swipe-up'],
    requirements: ['Lifestyle, vlog, or productivity niche', 'Natural product placement — no hard sell'],
    payoutTerms: 'Flat fee net-15 plus 12-month coffee subscription and 15% affiliate commission.',
    deadline: '2026-07-15',
    matchScore: 72,
  },
  {
    id: 'deal_08',
    brand: 'Stackwise',
    brandColor: '#00D4FF',
    brandAbout: 'Bookkeeping and tax automation built for creators and solo businesses — trusted by 80K freelancers.',
    category: 'Finance',
    tagline: 'Creator finance education series (3-part)',
    payoutMin: 5000,
    payoutMax: 9500,
    deliverables: ['3-part educational video series', '1 newsletter feature', 'Webinar co-host appearance'],
    requirements: ['Business, finance, or creator-economy content', 'Audience of working creators/freelancers', 'Scripts co-reviewed for compliance', 'No competing fintech promos for 60 days'],
    payoutTerms: 'Per-episode fee net-15, plus $1,000 completion bonus for the full series.',
    deadline: '2026-08-15',
    matchScore: 81,
  },
  {
    id: 'deal_09',
    brand: 'Wanderlight Travel',
    brandColor: '#FFD400',
    brandAbout: 'Boutique group-travel operator curating creator retreats and workation packages in 18 destinations.',
    category: 'Travel',
    tagline: 'Lisbon creator retreat — documented trip',
    payoutMin: 3200,
    payoutMax: 5400,
    deliverables: ['1 travel vlog (10+ min)', '5 Instagram stories on location', '1 retreat review post'],
    requirements: ['Travel or lifestyle content', 'Available Sep 8-14 for the retreat', 'Passport valid 6+ months'],
    payoutTerms: 'Trip costs fully covered plus flat creator fee paid 50/50 before and after the retreat.',
    deadline: '2026-08-05',
    matchScore: 63,
  },
  {
    id: 'deal_10',
    brand: 'Nimbus Drive',
    brandColor: '#8ED1FC',
    brandAbout: 'Encrypted cloud storage with creator-friendly plans — unlimited version history and 4K proxy previews.',
    category: 'Tech',
    tagline: 'Workflow integration — "how I back up my footage"',
    payoutMin: 1500,
    payoutMax: 2800,
    deliverables: ['1 workflow/behind-the-scenes integration', '1 pinned comment with trial link'],
    requirements: ['Video-production or tech content', 'Show real workflow usage', 'FTC disclosure required'],
    payoutTerms: 'Flat fee net-30 plus $5 per trial signup for 60 days.',
    deadline: '2026-09-01',
    matchScore: 70,
  },
];

/** Read applications defensively — state persisted before C2 lacks the field. */
function marketplaceApps(): DealApplication[] {
  return getState().marketplaceApplications ?? [];
}

registerMock('GET', '/marketplace/deals', (ctx) => {
  requireAuth(ctx);
  const appliedIds = new Set(marketplaceApps().map((a) => a.dealId));
  let deals: BrandDeal[] = MARKETPLACE_DEALS.map((d) => ({ ...d, applied: appliedIds.has(d.id) }));

  const { category, search, sort } = ctx.query;
  if (category && category !== 'All') {
    deals = deals.filter((d) => d.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    deals = deals.filter(
      (d) =>
        d.brand.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }
  if (sort === 'payout') deals.sort((a, b) => b.payoutMax - a.payoutMax);
  else if (sort === 'deadline') deals.sort((a, b) => a.deadline.localeCompare(b.deadline));
  else deals.sort((a, b) => b.matchScore - a.matchScore);

  return deals;
});

registerMock('GET', '/marketplace/applications', (ctx) => {
  requireAuth(ctx);
  return marketplaceApps();
});

/* The mock registry matches exact paths, so register one apply route per
   catalog deal — same shape as the real API's POST /marketplace/deals/:id/apply. */
for (const deal of MARKETPLACE_DEALS) {
  registerMock('POST', `/marketplace/deals/${deal.id}/apply`, (ctx) => {
    requireAuth(ctx);
    const body = ctx.body as { pitch?: string };
    const pitch = body?.pitch?.trim() ?? '';
    if (pitch.length < 10) {
      throw new ApiError(400, 'Add a short pitch (at least 10 characters)');
    }
    if (marketplaceApps().some((a) => a.dealId === deal.id)) {
      throw new ApiError(409, 'You already applied to this deal');
    }

    let application: DealApplication | undefined;
    mutate((s) => {
      const counter = s.applicationCounter ?? 100;
      s.applicationCounter = counter + 1;
      application = {
        id: `app_${String(counter).padStart(2, '0')}`,
        dealId: deal.id,
        brand: deal.brand,
        brandColor: deal.brandColor,
        category: deal.category,
        payoutMin: deal.payoutMin,
        payoutMax: deal.payoutMax,
        pitch,
        submitted: todayLabel(),
        status: 'Pending',
      };
      s.marketplaceApplications = [application, ...(s.marketplaceApplications ?? [])];
    });

    const response: DealApplyResponse = { application: application! };
    return response;
  });
}
