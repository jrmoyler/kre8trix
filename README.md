# Kre8trix — Creator Financial OS

A fintech platform for content creators. Unified banking, credit scoring, USDC payments, and revenue-backed financing.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Recharts + Framer Motion

## Dev

```bash
npm install
npm run dev     # port 3000
npm run build   # dist/
```

## API layer

All data access goes through `src/lib/api.ts` (fetch wrapper, `ApiError`,
JWT auth headers). By default the app runs against an in-browser mock
backend (`src/lib/mock/handlers.ts`) with mutable session state — sends,
conversions, advance applications, and settings changes persist for the
browser session.

To point the app at a real API, set `VITE_API_URL` (see `.env.example`).
No page code changes are needed; the mock registry is bypassed entirely.

## Auth

`/login` provides sign-in/sign-up (demo: any email + 6-character password).
The JWT is stored in `localStorage` and attached as a `Bearer` header; all
app routes are wrapped in a `ProtectedRoute` that redirects to `/login`.
