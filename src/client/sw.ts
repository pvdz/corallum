// The service worker: network first, so a reachable server always gives the current game, and
// whatever the last visit fetched answers when it is not (an installed reef opens on a plane).
// Served at /sw.js (scope: the whole site), with its types stripped like every other module.

const CACHE = 'corallum-v1';

type FetchEvt = Event & { request: Request; respondWith(r: Promise<Response>): void };
type ExtendableEvt = Event & { waitUntil(p: Promise<unknown>): void };
type NotificationEvt = ExtendableEvt & { notification: { close(): void } };
type WindowClient = { focus(): Promise<unknown> };
const sw = self as unknown as {
  addEventListener(type: 'fetch', fn: (e: FetchEvt) => void): void;
  addEventListener(type: 'install' | 'activate', fn: (e: ExtendableEvt) => void): void;
  addEventListener(type: 'notificationclick', fn: (e: NotificationEvt) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void>; matchAll(o: { type: 'window'; includeUncontrolled: boolean }): Promise<WindowClient[]>; openWindow(url: string): Promise<unknown> };
};

// A tap on one of the reef's notifications (shown through this worker) brings the reef forward.
sw.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => list[0] ? list[0].focus() : sw.clients.openWindow('/')));
});

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
