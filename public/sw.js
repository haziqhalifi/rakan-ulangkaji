// Rakan Ulangkaji service worker. Hand written, no libraries.
// __BUILD_ID__ is replaced at build time, so every build changes this file and
// browsers see an update. No skipWaiting and no clients.claim: a new worker
// waits until the app is closed, so an exam is never swapped mid-way.
const BUILD_ID = '__BUILD_ID__';
const CACHE = 'rakan-v' + BUILD_ID;
const scopeUrl = (path) => new URL(path, self.registration.scope).href;
// The manifest lists base-prefixed paths such as /rakan-ulangkaji/assets/a.js.
// Keep only the part below this worker's scope so it also works at the root.
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const toScopeUrl = (f) => scopeUrl(f.startsWith(SCOPE_PATH) ? f.slice(SCOPE_PATH.length) : f.replace(/^\//, ''));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(scopeUrl('precache-manifest.json'), { cache: 'no-store' });
      const manifest = await res.json();
      const cache = await caches.open(CACHE);
      await cache.addAll(manifest.files.map(toScopeUrl));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rakan-v') && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Chat proxy: network only, never cached.
  if (url.pathname.startsWith(SCOPE_PATH + 'api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(scopeUrl('index.html')).then((hit) => hit || fetch(req).catch(() => Response.error())),
    );
    return;
  }

  // Everything else: cache first, then fill the cache on first online use.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
