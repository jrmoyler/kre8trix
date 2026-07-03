/**
 * Auth domain module for the Kre8trix API layer.
 *
 * Endpoints:
 *   POST /auth/login   — email + password (>= 8 chars) → { token, user }
 *   POST /auth/signup  — name + email + password → { token, user }
 *   GET  /auth/me      — resolves the current session token to a User
 *   POST /auth/logout  — invalidates the session (no-op in mock mode)
 *
 * The mock backend issues a fake JWT whose payload segment encodes the user,
 * so GET /auth/me can restore the session across reloads without any server
 * state. The token lives in localStorage under 'kre8trix_token' — the same
 * key the core client (src/lib/api.ts) reads for its Authorization header.
 */
import { ApiError, get, post, getAuthToken, registerMockHandler } from './index';
import type { User } from './index';

/** localStorage key holding the session JWT (must match src/lib/api.ts). */
const TOKEN_STORAGE_KEY = 'kre8trix_token';

/* ── payloads ─────────────────────────────────────────────────────────── */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  /** Display name; derived from the email when omitted. */
  name?: string;
}

/** Response from POST /auth/login and POST /auth/signup. */
export interface AuthResponse {
  /** Fake JWT session token. */
  token: string;
  user: User;
}

/* ── token storage ────────────────────────────────────────────────────── */

/** Persists the session JWT where the API client expects it. */
export function storeAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage unavailable (private mode) — session lasts until reload */
  }
}

/** Removes the session JWT from storage. */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ── mock helpers ─────────────────────────────────────────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Builds a mock User from signup/login details. */
function buildUser(email: string, name?: string): User {
  const local = email.split('@')[0] ?? 'creator';
  const handle = `@${local.toLowerCase().replace(/[^a-z0-9]/g, '')}` || '@creator';
  const fallbackName = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
  return {
    id: `usr_${Math.abs(hashCode(email)).toString(36)}`,
    name: name?.trim() || fallbackName || 'Creator',
    handle,
    email,
    avatarUrl: '/avatar-creator-1.png',
  };
}

/** Simple string hash for deterministic mock user ids. */
function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Encodes a fake (unsigned) JWT whose payload carries the user. */
function encodeMockJwt(user: User): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  const header = encode({ alg: 'none', typ: 'JWT' });
  const payload = encode({ sub: user.id, user, iat: Date.now() });
  return `${header}.${payload}.mock-signature`;
}

/** Decodes the user from a fake JWT, or null when malformed. */
function decodeMockJwt(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { user?: User };
    return payload.user && payload.user.email ? payload.user : null;
  } catch {
    return null;
  }
}

/** Validates shared login/signup credentials, throwing ApiError on failure. */
function assertCredentials(body: unknown): LoginPayload & { name?: string } {
  const { email, password, name } = (body ?? {}) as Partial<SignupPayload>;
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  }
  if (!password || password.length < 8) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Password must be at least 8 characters.');
  }
  return { email, password, name };
}

/* ── mock handlers ────────────────────────────────────────────────────── */

registerMockHandler('POST', '/auth/login', (_params, body) => {
  const { email } = assertCredentials(body);
  const user = buildUser(email);
  return { token: encodeMockJwt(user), user } satisfies AuthResponse;
});

registerMockHandler('POST', '/auth/signup', (_params, body) => {
  const { email, name } = assertCredentials(body);
  const user = buildUser(email, name);
  return { token: encodeMockJwt(user), user } satisfies AuthResponse;
});

registerMockHandler('GET', '/auth/me', () => {
  const token = getAuthToken();
  const user = token ? decodeMockJwt(token) : null;
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired — please sign in again.');
  }
  return user;
});

registerMockHandler('POST', '/auth/logout', () => ({ ok: true }));

/* ── typed API functions ──────────────────────────────────────────────── */

/** POST /auth/login — signs in and returns the session token + user. */
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', payload);
}

/** POST /auth/signup — creates an account and returns the session token + user. */
export function signup(payload: SignupPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/signup', payload);
}

/** GET /auth/me — resolves the stored session token to the signed-in user. */
export function fetchCurrentUser(): Promise<User> {
  return get<User>('/auth/me');
}

/** POST /auth/logout — ends the session server-side. */
export function logout(): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/auth/logout');
}
