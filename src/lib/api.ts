/*
 * B1 — API layer.
 *
 * All UI data access goes through `api.get/post/put/del`. When
 * `VITE_API_URL` is set the request is sent to that server with JSON
 * encoding and an Authorization header. When it is not set, requests are
 * served by the in-browser mock backend registered via `registerMock`
 * (see src/lib/mock/handlers.ts), so the app can be pointed at a real
 * API later without touching any page code.
 */

/* ─────────────────────────── errors ─────────────────────────── */

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

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

/* ─────────────────────────── mock registry ─────────────────────────── */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface MockContext {
  /** Parsed query-string parameters. */
  query: Record<string, string>;
  /** JSON request body, if any. */
  body: unknown;
  /** Bearer token from the Authorization header (null when logged out). */
  token: string | null;
  /** C5: path params captured from `:param` segments in the registered path. */
  params: Record<string, string>;
}

export type MockHandler = (ctx: MockContext) => unknown;

const mockRegistry = new Map<string, MockHandler>();

export function registerMock(method: HttpMethod, path: string, handler: MockHandler) {
  mockRegistry.set(`${method} ${path}`, handler);
}

/** Simulated network latency so loading states are visible in dev. */
const MOCK_LATENCY_MS = 450;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/* C5: registered paths may declare `:param` segments (e.g. `/notifications/:id/read`).
   Exact-path handlers still win; patterns are only consulted on an exact-lookup miss. */
function matchMockRoute(
  method: HttpMethod,
  pathname: string,
): { handler: MockHandler; params: Record<string, string> } | null {
  const requestSegments = pathname.split('/');
  for (const [key, handler] of mockRegistry) {
    if (!key.startsWith(`${method} `) || !key.includes('/:')) continue;
    const patternSegments = key.slice(method.length + 1).split('/');
    if (patternSegments.length !== requestSegments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i++) {
      const segment = patternSegments[i];
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(requestSegments[i]);
      } else if (segment !== requestSegments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler, params };
  }
  return null;
}

async function dispatchMock(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  const [pathname, search = ''] = path.split('?');
  let handler = mockRegistry.get(`${method} ${pathname}`);
  let params: Record<string, string> = {};
  if (!handler) {
    const match = matchMockRoute(method, pathname);
    if (match) {
      handler = match.handler;
      params = match.params;
    }
  }
  if (!handler) {
    throw new ApiError(404, `No mock handler for ${method} ${pathname}`);
  }
  const query: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    query[key] = value;
  });

  await delay(MOCK_LATENCY_MS * (0.6 + Math.random() * 0.8));
  return handler({ query, body, token: getToken(), params });
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
  if (API_URL) {
    return (await dispatchFetch(method, path, body)) as T;
  }
  return (await dispatchMock(method, path, body)) as T;
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
