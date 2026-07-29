/* SC Aura ERP – service worker (PWA readiness only, no offline API caching).
 *
 * We keep this deliberately minimal so it doesn't cache stale bookings /
 * dispatch data. Only the app shell (index.html + static build assets) is
 * cached for fast reloads and offline fallback screen.
 */
const CACHE = "sca-shell-v1";
const OFFLINE_FALLBACK = "/offline.html";
const APP_SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL.filter(Boolean))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never intercept API calls – always go to network so live data stays fresh.
  if (url.pathname.startsWith("/api/")) return;
  // For navigation, try network first, fallback to offline shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_FALLBACK).then((r) => r || caches.match("/")))
    );
    return;
  }
  // Static assets: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
