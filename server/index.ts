/*
 * E2 — the real Kre8trix API server.
 *
 * A dependency-free node:http server that executes the same route
 * handlers as the in-browser mock (src/backend/handlers.ts) and layers
 * on what a browser mock can't provide:
 *
 *   - real HS256 JWTs, verified on every request (server/jwt.ts)
 *   - credential checking with scrypt password hashes (server/users.ts)
 *   - per-account state persisted to disk (server/store.ts)
 *
 * Configuration (all optional):
 *   PORT                  listen port                        (default 4000)
 *   KRE8TRIX_DATA_DIR     where state/users JSON lives       (default server/.data)
 *   KRE8TRIX_JWT_SECRET   HMAC secret — set in production;
 *                         defaults to a random per-boot value
 *   KRE8TRIX_DEMO         '0' disables auto-provisioning
 *                         unknown emails on login            (default on)
 *   KRE8TRIX_EPHEMERAL    '1' keeps everything in memory     (default off)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Side-effect import: registers every shared route in the registry. */
import '../src/backend/handlers';
import { appendAuditLog } from '../src/backend/handlers';
import { ApiError, dispatch, registerRoute, type HttpMethod } from '../src/backend/registry';
import { getState, mutate, setStateNamespace, setStateStore } from '../src/backend/state';
import { EMAIL_RE, type AuthResponse } from '../src/lib/types';
import { signJwt, verifyJwt } from './jwt';
import { createFileStore, createMemoryStore } from './store';
import { createUserStore, type UserRecord } from './users';

/* ─────────────────────────── configuration ─────────────────────────── */

const PORT = Number(process.env.PORT) || 4000;
const EPHEMERAL = process.env.KRE8TRIX_EPHEMERAL === '1';
const DEMO_AUTO_PROVISION = process.env.KRE8TRIX_DEMO !== '0';
const DATA_DIR =
  process.env.KRE8TRIX_DATA_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '.data');
const JWT_SECRET = process.env.KRE8TRIX_JWT_SECRET ?? randomBytes(32).toString('hex');
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, matching the mock's claim

const MAX_BODY_BYTES = 1024 * 1024;

setStateStore(EPHEMERAL ? createMemoryStore() : createFileStore(DATA_DIR));
const users = createUserStore(EPHEMERAL ? null : DATA_DIR);

/* ─────────────────────────── auth overrides ───────────────────────────
 *
 * The shared handlers accept any credentials (they're also the browser
 * demo). Re-registering these routes replaces them with implementations
 * that check real credentials and mint signed JWTs. Everything else —
 * wallet, advances, KYC, AML, audit log, marketplace, tax, OAuth —
 * runs the shared handlers unchanged.
 */

function issueToken(user: UserRecord): string {
  return signJwt({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, TOKEN_TTL_SECONDS);
}

/** Point the state layer at this account and stamp its identity into fresh state. */
function activateAccount(user: UserRecord) {
  setStateNamespace(user.id);
  const state = getState();
  if (state.user.id !== user.id) {
    mutate((s) => {
      s.user = { ...s.user, id: user.id, name: user.name, email: user.email, handle: user.handle };
      s.profile = { ...s.profile, name: user.name, email: user.email, handle: user.handle };
    });
  }
}

function authResponse(user: UserRecord): AuthResponse {
  return { token: issueToken(user), user: getState().user };
}

registerRoute('POST', '/auth/signup', (ctx) => {
  const body = ctx.body as { name?: string; email?: string; password?: string };
  if (!body?.name?.trim()) throw new ApiError(400, 'Name is required');
  if (!body?.email || !EMAIL_RE.test(body.email.trim())) {
    throw new ApiError(400, 'Enter a valid email address');
  }
  if (!body?.password || body.password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  if (users.findByEmail(body.email)) {
    throw new ApiError(409, 'An account with this email already exists — sign in instead');
  }

  const user = users.create({ name: body.name, email: body.email, password: body.password });
  activateAccount(user);
  mutate((s) => appendAuditLog(s, 'signup', 'Account created'));
  return authResponse(user);
});

registerRoute('POST', '/auth/login', (ctx) => {
  const body = ctx.body as { email?: string; password?: string };
  if (!body?.email || !EMAIL_RE.test(body.email.trim())) {
    throw new ApiError(400, 'Enter a valid email address');
  }
  if (!body?.password || body.password.length < 6) {
    throw new ApiError(401, 'Invalid email or password');
  }

  let user = users.findByEmail(body.email);
  if (!user) {
    if (!DEMO_AUTO_PROVISION) throw new ApiError(401, 'Invalid email or password');
    // Demo mode: first sign-in provisions the account, mirroring the
    // in-browser mock's "any email + 6-character password" behavior.
    const localPart = body.email.trim().split('@')[0];
    const name = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
    user = users.create({ name: name || 'Creator', email: body.email, password: body.password });
  } else if (!users.verifyPassword(user, body.password)) {
    throw new ApiError(401, 'Invalid email or password');
  }

  activateAccount(user);
  mutate((s) => appendAuditLog(s, 'login', 'Signed in'));
  return authResponse(user);
});

/* GET /auth/me stays on the shared handler: once the middleware below
   has verified the JWT and selected the account namespace, the shared
   implementation returns exactly the right user. */

/* ─────────────────────────── http plumbing ─────────────────────────── */

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new ApiError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ApiError(400, 'Request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Verify the Bearer token and select the account's state namespace.
 * Returns the raw token only when it is genuinely valid, so the shared
 * handlers' presence check (`requireAuth`) becomes a real auth check.
 */
function authenticate(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  const claims = verifyJwt(token, JWT_SECRET);
  if (!claims) return null;
  const user = users.findById(claims.sub);
  if (!user) return null;
  activateAccount(user);
  return token;
}

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '/';
  /* Accept both `/auth/login` (vite proxy strips `/api`) and
     `/api/auth/login` (VITE_API_URL pointing here directly). */
  const path = url.startsWith('/api/') ? url.slice(4) : url;

  if (req.method === 'GET' && path.split('?')[0] === '/health') {
    sendJson(res, 200, { ok: true, ephemeral: EPHEMERAL, demo: DEMO_AUTO_PROVISION });
    return;
  }

  if (!HTTP_METHODS.includes(req.method as HttpMethod)) {
    sendJson(res, 405, { message: `Method ${req.method} not allowed` });
    return;
  }

  try {
    const body = await readBody(req);
    const token = authenticate(req);
    const result = dispatch(req.method as HttpMethod, path, { body, token });
    if (result === undefined) {
      res.writeHead(204);
      res.end();
      return;
    }
    sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof ApiError) {
      sendJson(res, err.status, { message: err.message, details: err.details });
      return;
    }
    console.error(`[kre8trix-api] ${req.method} ${path} failed:`, err);
    sendJson(res, 500, { message: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[kre8trix-api] listening on http://localhost:${PORT}`);
  console.log(
    `[kre8trix-api] storage: ${EPHEMERAL ? 'in-memory (ephemeral)' : DATA_DIR} · demo auto-provision: ${DEMO_AUTO_PROVISION ? 'on' : 'off'}`,
  );
  if (!process.env.KRE8TRIX_JWT_SECRET) {
    console.log('[kre8trix-api] KRE8TRIX_JWT_SECRET not set — using a random per-boot secret (existing tokens invalidate on restart)');
  }
});
