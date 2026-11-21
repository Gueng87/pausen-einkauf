// Service Worker: legt alle App-Dateien beim ersten Besuch ab, damit die Einkaufsliste
// auch im Laden ohne Netz aufgeht. Es werden nur eigene Dateien geladen, nichts wird verschickt.
// Wichtig: Jede Änderung an einer App-Datei wird erst ausgeliefert, wenn CACHE_VERSION erhöht wird.
const CACHE_VERSION = "2026-11-21-1";
const PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icon.svg",
  "icon-512.png",
  "apple-touch-icon.png",
  "src/main.js",
  "src/engine.js",
  "src/storage.js",
  "src/data/ingredients.js",
  "src/data/recipes.js",
];
const PREFIX = "satt-und-fit-";
const CACHE_NAME = PREFIX + CACHE_VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
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
    })(),
  );
});
