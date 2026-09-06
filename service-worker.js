// Bei jeder inhaltlichen Änderung der App diese Versionsnummer erhöhen (v2, v3, ...).
// Das zwingt Browser dazu, den Service Worker neu zu installieren statt die alte
// Version aus dem Cache weiterzuverwenden.
const CACHE_NAME = "zeit-detektiv-cache-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Beim Installieren: alle Dateien frisch aus dem Netzwerk in den Cache legen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Beim Aktivieren: alte Caches aufräumen und sofort die Kontrolle übernehmen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategie:
// - HTML-Seiten (Navigation): IMMER zuerst versuchen, die aktuelle Version aus dem
//   Netz zu laden. Nur wenn kein Internet verfügbar ist, wird die zwischengespeicherte
//   Version genutzt. So sehen alle Browser sofort neue App-Versionen.
// - Andere Dateien (Icons, Manifest): zuerst aus dem Cache (schnell & offline-fähig),
//   im Hintergrund aber ebenfalls aktualisiert.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isHTML =
    req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept") && req.headers.get("accept").includes("text/html"));

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
