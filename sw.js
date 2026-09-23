/**
 * MENVA — service worker.
 *  - /vendor, /assets: cache-first (immutable — URLs change when content changes)
 *  - /css, /js: stale-while-revalidate (instant from cache, refreshed in the background)
 *  - /data/*: network-first (menu data must be current; cache only as offline fallback)
 *  - page navigations: network-first, falling back to the cached app shell when offline
 * .usdz and Range requests are left to the browser: Quick Look and media fetches need the raw network path.
 */
const BUILD = '__BUILD__'; // replaced by scripts/build.mjs on every build
const IMMUTABLE_CACHE = 'menva-immutable-v1';
const STATIC_CACHE = `menva-static-${BUILD}`;
const SHELL = '/index.html';

const IMMUTABLE = /^\/(vendor|assets)\//;
const STATIC = /^\/(css|js)\//;
const DATA = /^\/data\//;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== IMMUTABLE_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.headers.has('range') || url.pathname.endsWith('.usdz')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, STATIC_CACHE, SHELL));
  } else if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else if (DATA.test(url.pathname)) {
    event.respondWith(networkFirst(req, STATIC_CACHE));
  } else if (STATIC.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

const cacheable = (res) => res && res.ok && res.type === 'basic' && res.status === 200;

async function cacheFirst(req) {
  const cache = await caches.open(IMMUTABLE_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) cache.put(req, res.clone());
  return res;
}

// cacheKey lets every page navigation share one cached app shell (the SPA serves index.html for all paths).
async function networkFirst(req, cacheName, cacheKey = req) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (cacheable(res)) cache.put(cacheKey, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (cacheable(res)) cache.put(req, res.clone());
    return res;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh;
}
