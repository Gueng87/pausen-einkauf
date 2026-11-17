// Service Worker: legt alle App-Dateien beim ersten Besuch ab, damit die App ohne Netz startet.
// Es werden nur Dateien der eigenen Herkunft geladen, nichts wird verschickt.
// Wichtig: Die App-Dateien kommen zuerst aus dem Cache. Jede Aenderung an einer Datei unter app/
// (Code oder Daten) wird erst ausgeliefert, wenn CACHE_VERSION erhoeht wird.
// tools/refresh (Task 8) erhoeht sie bei jedem Lauf, der etwas schreibt.
const CACHE_VERSION = "2026-11-18-1";
const PRECACHE = ["./","apple-touch-icon.png","data/products.json","icon-512.png","icon.svg","index.html","manifest.webmanifest","src/engine.js","src/feedback.js","src/main.js","src/model.js","src/storage.js","src/targets.js","src/ui.js","styles.css"];
const CACHE_NAME = `pausen-einkauf-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("pausen-einkauf-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then(async (res) => {
      if (res.ok) await cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  event.waitUntil(refresh);
  if (cached) return cached;
  return (await refresh) || Response.error();
}

async function cacheFirst(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) event.waitUntil(cache.put(request, res.clone()).catch(() => {}));
    return res;
  } catch {
    if (request.mode === "navigate") {
      const start = await cache.match("./");
      if (start) return start;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/data/products.json")) {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(cacheFirst(event));
  }
});
