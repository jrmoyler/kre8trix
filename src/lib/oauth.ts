/*
 * C4 — client-side helpers for the platform-connect OAuth 2.0
 * authorization-code flow (YouTube / TikTok / Stripe).
 *
 * The provider is mocked (src/lib/mock/handlers.ts) but the flow shape
 * is real OAuth:
 *   1. GET  /oauth/:platform/start   → authorize URL + CSRF state token
 *      (state is stored in mock state AND sessionStorage)
 *   2. /oauth/authorize consent page → redirects with ?code&state
 *      (or ?error=access_denied when the user denies)
 *   3. POST /oauth/token             → exchanges the code, marks the
 *      platform connected, then the app returns to where it started.
 */

import { api } from './api';
import type { OAuthPlatform, OAuthStartResponse } from './types';

export const OAUTH_CLIENT_ID = 'kre8trix-web';
export const OAUTH_REDIRECT_PATH = '/oauth/callback';

export interface OAuthScope {
  id: string;
  description: string;
}

export interface OAuthProviderMeta {
  slug: OAuthPlatform;
  /** Connection name as it appears in `PlatformConnection.name`. */
  name: string;
  color: string;
  /** Display-only provider host shown on the mock consent screen. */
  authHost: string;
  scopes: OAuthScope[];
}

export const OAUTH_PROVIDERS: Record<OAuthPlatform, OAuthProviderMeta> = {
  youtube: {
    slug: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    authHost: 'accounts.google.com',
    scopes: [
      { id: 'youtube.readonly', description: 'View your YouTube channel and video analytics' },
      {
        id: 'yt-analytics-monetary.readonly',
        description: 'View monetary YouTube Analytics reports (ad revenue, RPM)',
      },
    ],
  },
  tiktok: {
    slug: 'tiktok',
    name: 'TikTok',
    color: '#FF0050',
    authHost: 'www.tiktok.com',
    scopes: [
      { id: 'user.info.basic', description: 'Read your TikTok profile info (avatar, display name)' },
      { id: 'video.list', description: 'Read your public videos and performance stats' },
    ],
  },
  stripe: {
    slug: 'stripe',
    name: 'Stripe',
    color: '#635BFF',
    authHost: 'connect.stripe.com',
    scopes: [
      { id: 'read_only', description: 'View your Stripe account data, payouts, and balances' },
      { id: 'read_write', description: 'Create payouts to your Kre8trix wallet on your behalf' },
    ],
  },
};

/** Resolve provider metadata from a platform slug (query param). */
export function oauthProviderFromSlug(slug: string | null): OAuthProviderMeta | null {
  if (slug && slug in OAUTH_PROVIDERS) return OAUTH_PROVIDERS[slug as OAuthPlatform];
  return null;
}

/** Map a connection display name (e.g. "YouTube") to its OAuth slug, if any. */
export function oauthSlugForConnection(name: string): OAuthPlatform | null {
  const match = Object.values(OAUTH_PROVIDERS).find((p) => p.name === name);
  return match ? match.slug : null;
}

/* ── pending flow (sessionStorage, for CSRF state validation) ── */

const PENDING_KEY = 'kre8trix.oauth.pending';

export interface PendingOAuth {
  platform: OAuthPlatform;
  state: string;
  /** Route to return to once the flow completes (Settings or Onboarding). */
  returnTo: string;
  startedAt: number;
}

export function readPendingOAuth(): PendingOAuth | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingOAuth;
  } catch {
    return null;
  }
}

export function clearPendingOAuth() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/**
 * Kick off the authorization-code flow: fetch an authorize URL + state
 * token from the backend, persist the pending flow for CSRF validation
 * on callback, and return the URL to navigate to.
 */
export async function startOAuthFlow(platform: OAuthPlatform, returnTo: string): Promise<string> {
  const res = await api.get<OAuthStartResponse>(`/oauth/${platform}/start`);
  const pending: PendingOAuth = {
    platform: res.platform,
    state: res.state,
    returnTo,
    startedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable — callback will surface a state error */
  }
  return res.authorizeUrl;
}
