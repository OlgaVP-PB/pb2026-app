/* PB 2026 conference app - service worker.
   Two jobs:
   1. Make the app installable, so phones offer "Add to Home Screen" and it
      opens as its own icon without browser chrome.
   2. Keep the programme and practical info readable when the venue wifi dies.

   Strategy: network first, cache as a fallback. Whatever is online is always
   what people see; the cached copy only appears when the network fails. */
const CACHE = "pb2026-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add("./")));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Only keep good, basic responses - never cache an error page.
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        // A navigation with nothing cached for that exact URL: fall back to the app shell.
        if (req.mode === "navigate") {
          const shell = await caches.match("./");
          if (shell) return shell;
        }
        throw new Error("offline");
      })
  );
});
