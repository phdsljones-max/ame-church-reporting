/* AME Reports service worker (hand-rolled).
 * - Network-first for /api/* (auth endpoints are never cached).
 * - Cache-first for same-origin static assets.
 * - Navigations fall back to the cached app shell when offline.
 */
const CACHE_VERSION = "ame-reports-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Never cache or serve API responses; always go to the network.
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Cross-origin: let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cached app shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((res) => res || caches.match("/"))
      )
    );
    return;
  }

  // Same-origin static assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
