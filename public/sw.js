/* Kre8trix service worker — hand-rolled PWA offline support (task C6).
 * Strategy:
 *   - Precache the app shell on install.
 *   - Cache-first for hashed build assets under /assets/ (immutable filenames).
 *   - Network-first with cache fallback for navigation requests.
 *   - Offline fallback page when nothing is cached.
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `kre8trix-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
  '/icon-192.png',
  '/icon-512.png',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#06060E">
<title>Kre8trix — Offline</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #06060E; color: #EAEAF2; font-family: system-ui, -apple-system, sans-serif; }
  .card { text-align: center; padding: 2rem; }
  .mark { font-size: 3rem; font-weight: 800; color: #C8FF00; letter-spacing: 0.05em; }
  h1 { font-size: 1.25rem; margin: 1rem 0 0.5rem; }
  p { color: #8A8AA0; margin: 0 0 1.5rem; }
  button { background: #C8FF00; color: #06060E; border: 0; border-radius: 8px;
           padding: 0.75rem 1.5rem; font-weight: 700; font-size: 1rem; cursor: pointer; }
</style>
</head>
<body>
<div class="card">
  <div class="mark">K8</div>
  <h1>You're offline</h1>
  <p>Kre8trix needs a connection to load fresh data.</p>
  <button onclick="location.reload()">Retry</button>
</div>
</body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('kre8trix-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || offlineResponse())
        )
    );
    return;
  }

  // Hashed build assets: cache-first (filenames are content-hashed, safe forever).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else same-origin: network with cache fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || offlineResponse()))
  );
});
