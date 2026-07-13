# Kre8trix — Creator Financial OS

A fintech platform for content creators. Unified banking, credit scoring, USDC payments, and revenue-backed financing.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Recharts + Framer Motion
- Node.js API server (`server/`, dependency-free `node:http`)

## Dev

```bash
npm install
npm run dev     # frontend on port 3000 (in-browser mock backend)
npm run build   # dist/
```

### Running against the real backend

```bash
npm run api                    # API server on http://localhost:4000
VITE_API_URL=/api npm run dev  # frontend; vite proxies /api → :4000
```

`npm run api:watch` restarts the server on change. Server configuration
(JWT secret, data directory, demo mode) is documented in `.env.example`.

## Architecture

All UI data access goes through `src/lib/api.ts` (fetch wrapper,
`ApiError`, JWT auth headers). The business logic for every route lives
in **one place** — `src/backend/handlers.ts`, registered against the
runtime-agnostic route registry (`src/backend/registry.ts`) — and runs
on two transports:

- **In-browser mock** (default, `VITE_API_URL` unset): handlers execute
  in the browser with state in `sessionStorage`. Sends, conversions,
  advance applications, and settings changes persist for the browser
  session.
- **Real API server** (`server/index.ts`, `VITE_API_URL` set): the same
  handlers execute in Node behind real HS256 JWTs (verified on every
  request), scrypt-hashed credentials (`server/users.ts`), and
  per-account state persisted to disk (`server/store.ts`,
  `server/.data/`). No page code changes between the two modes.

## Auth

`/login` provides sign-in/sign-up. Against the mock, any email +
6-character password works. Against the real server, passwords are
checked; by default an unknown email is auto-provisioned on first
sign-in (demo mode — disable with `KRE8TRIX_DEMO=0`). The JWT is stored
in `localStorage` and attached as a `Bearer` header; all app routes are
wrapped in a `ProtectedRoute` that redirects to `/login`.

## Tests

```bash
npm run test:e2e       # Playwright suite against the in-browser mock
npm run test:e2e:api   # smoke suite against the real API server
```
