/* OS Journal service worker: makes the app installable and usable with a bad signal. */
const VERSION = "osj-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
// Pages kept for offline use. Only the log form and home, so little personal data sits on the device.
const OFFLINE_PAGES = ["/", "/log"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(["/offline.html", "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Sent on the login page: forget cached pages after logging out.
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Page loads: always try the network; fall back to a saved copy, then the offline page.
  if (req.mode === "navigate") {
    const keep = OFFLINE_PAGES.includes(url.pathname) && !url.search;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (keep && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { cacheName: PAGES })) || (await caches.match("/offline.html"))),
    );
  }
});
