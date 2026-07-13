/*
 * C4 — client-side helpers for the platform-connect OAuth 2.0
 * authorization-code flow (YouTube / TikTok / Stripe).
 *
 * The provider is mocked (src/backend/handlers.ts) but the flow shape
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

/* Provider metadata lives with the shared backend core; re-exported
   here so UI callers keep importing from '@/lib/oauth'. */
export {
  OAUTH_CLIENT_ID,
  OAUTH_PROVIDERS,
  OAUTH_REDIRECT_PATH,
  oauthProviderFromSlug,
  oauthSlugForConnection,
} from '../backend/oauth-providers';
export type { OAuthProviderMeta, OAuthScope } from '../backend/oauth-providers';

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
