/* Rent Bike service worker: push notifications + conservative offline cache.
 *
 * Caching policy (deliberately narrow — never cache booking/payment flows):
 * - /_next/static/*      cache-first (content-hashed, immutable)
 * - navigations (GET)    network-first, cache fallback, then /offline
 * - remote images        stale-while-revalidate, capped
 * - everything else      network only (API, POSTs, admin)
 */
'use strict';

const VERSION = 'rbx-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = '/offline';
const IMAGE_LIMIT = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > limit) {
    await cache.delete(keys[0]);
    return trimCache(name, limit);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Remote images only; API lives on another origin and is never cached.
    if (request.destination === 'image') {
      event.respondWith(
        caches.open(IMAGE_CACHE).then(async (cache) => {
          const hit = await cache.match(request);
          const network = fetch(request).then(async (res) => {
            if (res.ok) {
              cache.put(request, res.clone());
              trimCache(IMAGE_CACHE, IMAGE_LIMIT);
            }
            return res;
          });
          return hit || network;
        }),
      );
    }
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          const cache = await caches.open(PAGE_CACHE);
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
  }
});

// --- Web push (moved off backend /push-sw.js so the registration scope
// matches the frontend origin that registers it) ---
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Rent Bike Cox's Bazar";
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
