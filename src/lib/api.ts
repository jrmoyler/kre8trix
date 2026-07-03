/**
 * Core API client for Kre8trix.
 *
 * Routes every request through a pluggable backend:
 * - If `import.meta.env.VITE_API_URL` is set, requests hit the real backend
 *   over `fetch` with JSON handling, timeout, and JWT auth header injection.
 * - Otherwise, requests are served by the in-memory mock adapter
 *   (see `src/lib/mock/registry.ts`), which simulates network latency.
 *
 * Domain modules (src/lib/api/<domain>.ts) build typed functions on top of
 * the `get`/`post`/`put`/`del` helpers and register their own mock handlers —
 * no edits to this file are required to add a new domain.
 */
import { handleMockRequest } from './mock/registry';

/** localStorage key holding the session JWT. */
const TOKEN_STORAGE_KEY = 'kre8trix_token';

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** HTTP methods supported by the client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Error thrown for any failed API request — non-2xx responses, timeouts,
 * network failures, and unmatched mock routes.
 */
export class ApiError extends Error {
  /** HTTP status code (0 for network-level failures). */
  status: number;
  /** Machine-readable error code, e.g. 'NOT_FOUND', 'TIMEOUT'. */
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Options accepted by {@link request}. */
export interface RequestOptions {
  /** HTTP method. Defaults to 'GET'. */
  method?: HttpMethod;
  /** JSON-serializable request body. */
  body?: unknown;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Abort the request after this many ms. Defaults to 15000. */
  timeoutMs?: number;
  /** External abort signal (composed with the timeout). */
  signal?: AbortSignal;
}

/** Resolves after `ms` milliseconds. Handy for mock handlers and UI polish. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads the session JWT from localStorage, or null when signed out. */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Performs an API request and resolves with the parsed JSON response.
 *
 * In real mode (`VITE_API_URL` set) this wraps `fetch`; in mock mode it
 * consults the mock handler registry. Throws {@link ApiError} on any failure.
 *
 * @param path API path beginning with '/', e.g. '/wallet/transactions'.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const baseUrl: string | undefined = import.meta.env.VITE_API_URL;

  if (!baseUrl) {
    return handleMockRequest(method, path, options.body) as Promise<T>;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(0, 'TIMEOUT', `Request timed out: ${method} ${path}`);
    }
    throw new ApiError(0, 'NETWORK_ERROR', err instanceof Error ? err.message : 'Network request failed');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, 'INVALID_JSON', `Malformed JSON from ${method} ${path}`);
    }
  }

  if (!response.ok) {
    const errBody = data as { code?: string; message?: string } | undefined;
    throw new ApiError(
      response.status,
      errBody?.code ?? 'REQUEST_FAILED',
      errBody?.message ?? `${method} ${path} failed with status ${response.status}`,
    );
  }

  return data as T;
}

/** Typed GET helper. */
export function get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' });
}

/** Typed POST helper. */
export function post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body });
}

/** Typed PUT helper. */
export function put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body });
}

/** Typed DELETE helper (`delete` is a reserved word). */
export function del<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' });
}
