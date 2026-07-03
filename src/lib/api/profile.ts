/**
 * Creator profile domain module.
 *
 * Endpoints:
 *   GET  /profile                            — creator profile (name, handle, email, avatar, bio, KYC status)
 *   PUT  /profile                            — update the creator profile
 *   GET  /profile/platforms                  — connected platform list w/ status + revenue share
 *   POST /profile/platforms/:id/connect      — link a platform
 *   POST /profile/platforms/:id/disconnect   — unlink a platform
 *   GET  /profile/tax                        — tax info on file
 *   PUT  /profile/tax                        — update tax info
 *   GET  /profile/notifications              — notification preferences
 *   PUT  /profile/notifications              — update notification preferences
 *
 * Mock state lives in a module-level object that the handlers mutate, and
 * every write is mirrored to localStorage under 'kre8trix_profile' so
 * Settings saves survive a page refresh.
 */
import { ApiError, get, post, put, registerMockHandler } from './index';

/* ── Types ──────────────────────────────────────────────────────────── */

/** Identity-verification standing of the creator's account. */
export type KycStatus = 'verified' | 'pending' | 'unverified';

/** The creator profile as edited on the Settings page. */
export interface SettingsProfile {
  id: string;
  /** Display name, e.g. 'Alex Chen'. */
  name: string;
  /** Public handle, e.g. '@alexcreates'. */
  handle: string;
  email: string;
  /** Contact phone, e.g. '+1 (555) 123-4567'. */
  phone: string;
  /** Path or URL to the avatar image. */
  avatarUrl: string;
  /** Short public bio. */
  bio: string;
  kycStatus: KycStatus;
}

/** A revenue platform linked (or linkable) to the creator's account. */
export interface ConnectedPlatform {
  /** Stable platform id, e.g. 'youtube'. */
  id: string;
  /** Platform name, e.g. 'YouTube'. */
  name: string;
  /** Connected account label, e.g. '@alexcreates'; empty when unlinked. */
  user: string;
  connected: boolean;
  /** Hex brand color, e.g. '#FF0000'. */
  color: string;
  /** Share of total tracked revenue attributed to this platform, 0-100. */
  revenueShare: number;
}

/** Tax details on file for payouts and 1099 reporting. */
export interface TaxInfo {
  /** Legal name as it appears on tax documents. */
  legalName: string;
  /** Tax ID (SSN/EIN), stored masked in mock mode. */
  taxId: string;
  /** IRS classification, e.g. 'Individual / Sole Proprietor'. */
  taxClassification: string;
  country: string;
}

/** Per-event notification preferences. */
export interface NotificationPrefs {
  paymentReceived: boolean;
  advanceDue: boolean;
  scoreChanges: boolean;
  platformDisconnect: boolean;
  marketingEmails: boolean;
}

/** Fields accepted by PUT /profile. */
export type UpdateProfilePayload = Partial<Omit<SettingsProfile, 'id' | 'kycStatus'>>;

/* ── Mock state (persisted to localStorage) ─────────────────────────── */

/** localStorage key mirroring the mock profile state across refreshes. */
const STORAGE_KEY = 'kre8trix_profile';

interface ProfileState {
  profile: SettingsProfile;
  platforms: ConnectedPlatform[];
  tax: TaxInfo;
  notifications: NotificationPrefs;
}

function defaultState(): ProfileState {
  return {
    profile: {
      id: 'usr_alex',
      name: 'Alex Chen',
      handle: '@alexcreates',
      email: 'alex@kre8trix.app',
      phone: '+1 (555) 123-4567',
      avatarUrl: '/avatar-creator-1.png',
      bio: 'Creator building in public — video, commerce, and community.',
      kycStatus: 'verified',
    },
    platforms: [
      { id: 'youtube', name: 'YouTube', user: 'Alex Creates', connected: true, color: '#FF0000', revenueShare: 42 },
      { id: 'tiktok', name: 'TikTok', user: '@alexcreates', connected: true, color: '#FF0050', revenueShare: 18 },
      { id: 'shopify', name: 'Shopify', user: 'alexcreates.store', connected: true, color: '#96BF48', revenueShare: 24 },
      { id: 'stripe', name: 'Stripe', user: 'alex@kre8trix.app', connected: false, color: '#635BFF', revenueShare: 0 },
      { id: 'patreon', name: 'Patreon', user: '', connected: false, color: '#FF424D', revenueShare: 0 },
    ],
    tax: {
      legalName: 'Alexander Chen',
      taxId: '•••-••-4821',
      taxClassification: 'Individual / Sole Proprietor',
      country: 'United States',
    },
    notifications: {
      paymentReceived: true,
      advanceDue: true,
      scoreChanges: true,
      platformDisconnect: false,
      marketingEmails: false,
    },
  };
}

/** Restores persisted state, merging over defaults so new fields backfill. */
function loadState(): ProfileState {
  const defaults = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<ProfileState>;
    return {
      profile: { ...defaults.profile, ...stored.profile },
      platforms:
        Array.isArray(stored.platforms) && stored.platforms.length > 0 ? stored.platforms : defaults.platforms,
      tax: { ...defaults.tax, ...stored.tax },
      notifications: { ...defaults.notifications, ...stored.notifications },
    };
  } catch {
    return defaults;
  }
}

/** Mirrors the in-memory state to localStorage (best effort). */
function persistState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode) — state lasts until reload */
  }
}

const state: ProfileState = loadState();

/* ── Mock helpers ───────────────────────────────────────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Finds a platform by id or throws ApiError 404. */
function requirePlatform(id: string): ConnectedPlatform {
  const platform = state.platforms.find((p) => p.id === id);
  if (!platform) {
    throw new ApiError(404, 'NOT_FOUND', `Unknown platform '${id}'.`);
  }
  return platform;
}

/* ── Mock handlers ──────────────────────────────────────────────────── */

registerMockHandler('GET', '/profile', () => ({ ...state.profile }));

registerMockHandler('PUT', '/profile', (_params, body) => {
  const updates = (body ?? {}) as UpdateProfilePayload;
  if (updates.email !== undefined && !EMAIL_PATTERN.test(updates.email)) {
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  }
  if (updates.name !== undefined && !updates.name.trim()) {
    throw new ApiError(400, 'INVALID_NAME', 'Display name cannot be empty.');
  }
  Object.assign(state.profile, updates);
  persistState();
  return { ...state.profile };
});

registerMockHandler('GET', '/profile/platforms', () => state.platforms.map((p) => ({ ...p })));

registerMockHandler('POST', '/profile/platforms/:id/connect', (params) => {
  const platform = requirePlatform(params.id);
  platform.connected = true;
  if (!platform.user) platform.user = state.profile.handle;
  persistState();
  return { ...platform };
});

registerMockHandler('POST', '/profile/platforms/:id/disconnect', (params) => {
  const platform = requirePlatform(params.id);
  platform.connected = false;
  persistState();
  return { ...platform };
});

registerMockHandler('GET', '/profile/tax', () => ({ ...state.tax }));

registerMockHandler('PUT', '/profile/tax', (_params, body) => {
  Object.assign(state.tax, (body ?? {}) as Partial<TaxInfo>);
  persistState();
  return { ...state.tax };
});

registerMockHandler('GET', '/profile/notifications', () => ({ ...state.notifications }));

registerMockHandler('PUT', '/profile/notifications', (_params, body) => {
  Object.assign(state.notifications, (body ?? {}) as Partial<NotificationPrefs>);
  persistState();
  return { ...state.notifications };
});

/* ── Typed API functions ────────────────────────────────────────────── */

/** GET /profile — the creator's account profile. */
export function fetchProfile(): Promise<SettingsProfile> {
  return get<SettingsProfile>('/profile');
}

/** PUT /profile — saves profile edits and returns the updated profile. */
export function updateProfile(payload: UpdateProfilePayload): Promise<SettingsProfile> {
  return put<SettingsProfile>('/profile', payload);
}

/** GET /profile/platforms — connected platforms with status + revenue share. */
export function fetchPlatforms(): Promise<ConnectedPlatform[]> {
  return get<ConnectedPlatform[]>('/profile/platforms');
}

/** POST /profile/platforms/:id/connect — links a platform. */
export function connectPlatform(id: string): Promise<ConnectedPlatform> {
  return post<ConnectedPlatform>(`/profile/platforms/${encodeURIComponent(id)}/connect`);
}

/** POST /profile/platforms/:id/disconnect — unlinks a platform. */
export function disconnectPlatform(id: string): Promise<ConnectedPlatform> {
  return post<ConnectedPlatform>(`/profile/platforms/${encodeURIComponent(id)}/disconnect`);
}

/** GET /profile/tax — the tax info on file. */
export function fetchTaxInfo(): Promise<TaxInfo> {
  return get<TaxInfo>('/profile/tax');
}

/** PUT /profile/tax — saves tax info and returns the updated record. */
export function updateTaxInfo(payload: Partial<TaxInfo>): Promise<TaxInfo> {
  return put<TaxInfo>('/profile/tax', payload);
}

/** GET /profile/notifications — the creator's notification preferences. */
export function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  return get<NotificationPrefs>('/profile/notifications');
}

/** PUT /profile/notifications — saves notification preferences. */
export function updateNotificationPrefs(payload: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  return put<NotificationPrefs>('/profile/notifications', payload);
}
