/**
 * Mock backend adapter for the Kre8trix API client.
 *
 * ── Registration pattern ────────────────────────────────────────────────
 * Domain modules (src/lib/api/<domain>.ts) register their handlers at module
 * scope as a side effect of being imported:
 *
 *   // src/lib/api/wallet.ts
 *   import { get } from '../api';
 *   import { registerMockHandler } from '../mock/registry';
 *   import type { Transaction } from './types';
 *
 *   registerMockHandler('GET', '/wallet/transactions', () => MOCK_TRANSACTIONS);
 *   registerMockHandler('GET', '/wallet/transactions/:id', (params) =>
 *     MOCK_TRANSACTIONS.find((t) => t.id === params.id),
 *   );
 *
 *   export const fetchTransactions = () => get<Transaction[]>('/wallet/transactions');
 *
 * Because domain modules import the client (and pages import the domain
 * modules), registration happens automatically before any request fires —
 * no edits to this file or to api.ts are ever needed for a new domain.
 * ────────────────────────────────────────────────────────────────────────
 *
 * When `import.meta.env.VITE_API_URL` is unset, the core `request()` in
 * src/lib/api.ts routes every call here. The adapter matches the method +
 * path against registered patterns (supporting ':param' segments), waits a
 * deterministic pseudo-random 300-600ms to simulate network latency, and
 * returns the handler's result. Unknown routes reject with ApiError 404.
 */
import { ApiError, delay } from '../api';
import type { HttpMethod } from '../api';

/**
 * A mock route handler. Receives path params (from ':param' segments) and
 * the parsed request body, and returns the response payload (or a promise).
 */
export type MockHandler = (
  params: Record<string, string>,
  body?: unknown,
) => unknown | Promise<unknown>;

interface MockRoute {
  method: HttpMethod;
  segments: string[];
  handler: MockHandler;
}

const routes: MockRoute[] = [];

/**
 * Registers a handler for a method + path pattern in the mock backend.
 * Patterns support simple ':param' segments, e.g. '/advances/:id/repay'.
 * Registering the same method + pattern twice replaces the earlier handler.
 */
export function registerMockHandler(method: HttpMethod, pathPattern: string, handler: MockHandler): void {
  const segments = toSegments(pathPattern);
  const existing = routes.findIndex(
    (r) => r.method === method && r.segments.length === segments.length && r.segments.every((s, i) => s === segments[i]),
  );
  if (existing !== -1) routes.splice(existing, 1);
  routes.push({ method, segments, handler });
}

/**
 * Resolves a request against the registry. Simulates 300-600ms of latency
 * (deterministic per method + path) before dispatching to the matched
 * handler. Throws ApiError 404 when no handler matches.
 *
 * Called by `request()` in src/lib/api.ts when in mock mode.
 */
export async function handleMockRequest(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  const pathname = path.split('?')[0];
  await delay(mockLatency(`${method} ${pathname}`));

  const pathSegments = toSegments(pathname);
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchSegments(route.segments, pathSegments);
    if (params) return route.handler(params, body);
  }

  throw new ApiError(404, 'NOT_FOUND', `No mock handler registered for ${method} ${pathname}`);
}

/** Splits a path into non-empty segments: '/a/b/' → ['a', 'b']. */
function toSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** Matches pattern segments against path segments, capturing ':param's. */
function matchSegments(pattern: string[], path: string[]): Record<string, string> | null {
  if (pattern.length !== path.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(':')) {
      params[pattern[i].slice(1)] = decodeURIComponent(path[i]);
    } else if (pattern[i] !== path[i]) {
      return null;
    }
  }
  return params;
}

/** Deterministic pseudo-random latency in [300, 600] ms, keyed on the route. */
function mockLatency(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return 300 + (Math.abs(hash) % 301);
}
