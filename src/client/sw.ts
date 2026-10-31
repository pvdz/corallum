// The service worker: network first, so a reachable server always gives the current game, and
// whatever the last visit fetched answers when it is not (an installed reef opens on a plane).
// Served at /sw.js (scope: the whole site), with its types stripped like every other module.

const CACHE = 'corallum-v1';

type FetchEvt = Event & { request: Request; respondWith(r: Promise<Response>): void };
type ExtendableEvt = Event & { waitUntil(p: Promise<unknown>): void };
const sw = self as unknown as {
  addEventListener(type: 'fetch', fn: (e: FetchEvt) => void): void;
  addEventListener(type: 'install' | 'activate', fn: (e: ExtendableEvt) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
};

sw.addEventListener('install', (e) => e.waitUntil(sw.skipWaiting()));
sw.addEventListener('activate', (e) => e.waitUntil(sw.clients.claim()));

sw.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
      return res;
    } catch {
      // Offline: the page answers whatever its query was (?fresh, ?at=...).
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      return hit ?? new Response('offline', { status: 503, headers: { 'content-type': 'text/plain' } });
    }
  })());
});
