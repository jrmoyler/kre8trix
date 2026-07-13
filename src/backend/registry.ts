/*
 * E1 — runtime-agnostic route registry.
 *
 * The single source of truth for the Kre8trix API: every route handler
 * is registered here, and the registry is consumed by two transports —
 * the in-browser mock (src/lib/api.ts, when VITE_API_URL is unset) and
 * the real Node HTTP server (server/index.ts). This module must stay
 * free of browser globals (localStorage, import.meta.env) and Node
 * built-ins so both runtimes can import it.
 */

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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestContext {
  /** Parsed query-string parameters. */
  query: Record<string, string>;
  /** JSON request body, if any. */
  body: unknown;
  /** Bearer token from the Authorization header (null when logged out). */
  token: string | null;
  /** Path params captured from `:param` segments in the registered path. */
  params: Record<string, string>;
}

export type RouteHandler = (ctx: RequestContext) => unknown;

const registry = new Map<string, RouteHandler>();

/**
 * Register a handler for `METHOD /path`. Registering the same route twice
 * replaces the previous handler — the real server uses this to override
 * the demo auth routes with credential-checking implementations.
 */
export function registerRoute(method: HttpMethod, path: string, handler: RouteHandler) {
  registry.set(`${method} ${path}`, handler);
}

/* Registered paths may declare `:param` segments (e.g. `/notifications/:id/read`).
   Exact-path handlers still win; patterns are only consulted on an exact-lookup miss. */
function matchRoute(
  method: HttpMethod,
  pathname: string,
): { handler: RouteHandler; params: Record<string, string> } | null {
  const requestSegments = pathname.split('/');
  for (const [key, handler] of registry) {
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

/**
 * Resolve and invoke the handler for `method path?query`. Throws
 * ApiError(404) when no route matches. Handlers are synchronous; the
 * transports own latency simulation and response serialization.
 */
export function dispatch(
  method: HttpMethod,
  path: string,
  opts: { body?: unknown; token: string | null },
): unknown {
  const [pathname, search = ''] = path.split('?');
  let handler = registry.get(`${method} ${pathname}`);
  let params: Record<string, string> = {};
  if (!handler) {
    const match = matchRoute(method, pathname);
    if (match) {
      handler = match.handler;
      params = match.params;
    }
  }
  if (!handler) {
    throw new ApiError(404, `No handler for ${method} ${pathname}`);
  }
  const query: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    query[key] = value;
  });
  return handler({ query, body: opts.body, token: opts.token, params });
}
