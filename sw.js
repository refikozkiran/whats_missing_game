const CACHE_NAME = "whats-missing-v1000";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/splash.png"
];

// ── INSTALL: App shell'i cache'e al ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Eski cache'leri temizle ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first for app shell, network-first for others ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Sadece GET isteklerini yakala
  if (event.request.method !== "GET") return;

  // Chrome extension veya farklı origin'leri atla
  if (!url.protocol.startsWith("http")) return;

  const isAppShell = APP_SHELL.some(path => url.pathname === path || url.pathname === "/");

  if (isAppShell) {
    // Cache-first: önce cache, yoksa network'ten al ve cache'e yaz
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
  } else {
    // Network-first: önce network, başarısız olursa cache'e bak
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
