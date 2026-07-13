/*
 * B1 — API layer.
 *
 * All UI data access goes through `api.get/post/put/del`. When
 * `VITE_API_URL` is set the request is sent to that server with JSON
 * encoding and an Authorization header. When it is not set, requests
 * are served in-browser by the shared backend core
 * (src/backend/handlers.ts) via its route registry, so the app behaves
 * identically against the mock and the real server (server/index.ts) —
 * both run the same handlers.
 */

import { ApiError, dispatch, type HttpMethod } from '../backend/registry';

export { ApiError };
export type { HttpMethod };

/* ─────────────────────────── auth token ─────────────────────────── */

const TOKEN_KEY = 'kre8trix.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ─────────────────────────── mock transport ─────────────────────────── */

/** Simulated network latency so loading states are visible in dev. */
const MOCK_LATENCY_MS = 450;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function dispatchMock(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  await delay(MOCK_LATENCY_MS * (0.6 + Math.random() * 0.8));
  return dispatch(method, path, { body, token: getToken() });
}

/* ─────────────────────────── real transport ─────────────────────────── */

const API_URL: string | undefined = import.meta.env.VITE_API_URL;

async function dispatchFetch(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError(0, 'Network error — check your connection', cause);
  }

  if (!response.ok) {
    let details: unknown;
    let message = `Request failed (${response.status})`;
    try {
      details = await response.json();
      const detailMessage = (details as { message?: string })?.message;
      if (detailMessage) message = detailMessage;
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 401) clearToken();
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined;
  return response.json();
}

/* ─────────────────────────── public API ─────────────────────────── */

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  try {
    if (API_URL) {
      return (await dispatchFetch(method, path, body)) as T;
    }
    return (await dispatchMock(method, path, body)) as T;
  } catch (err) {
    // A 401 means the session is no longer valid — drop the stored token
    // regardless of which transport (real or mock) produced it.
    if (err instanceof ApiError && err.status === 401) clearToken();
    throw err;
  }
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },
  del<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
