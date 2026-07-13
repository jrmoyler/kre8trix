/*
 * C4/E1 — OAuth provider metadata for the platform-connect flow.
 *
 * Shared between the backend handlers (mock provider + real server)
 * and the consent-screen UI (re-exported via src/lib/oauth.ts). Keep
 * this module free of browser and Node globals.
 */

import type { OAuthPlatform } from '../lib/types';

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
