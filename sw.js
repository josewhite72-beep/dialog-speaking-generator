// Diálogos — Speaking & Reading — Service Worker
// Bump CACHE_VERSION whenever you change index.html to force clients to
// pick up the new file (same pattern used across José's other PWAs).
const CACHE_VERSION = "v1.0";
const CACHE_NAME = "dialogos-speaking-" + CACHE_VERSION;

const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("dialogos-speaking-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for the app shell so updates show up quickly; falls back to
// cache when offline. Everything else (fonts, the Anthropic API) goes
// straight to the network since it shouldn't be cached.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isAppShell = url.origin === self.location.origin;

  if (!isAppShell) return; // let CDN fonts / API calls pass through untouched

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Allows the in-app 🔄 button to force-clear this cache via
// navigator.serviceWorker.controller.postMessage({type:'CLEAR_CACHE'})
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
});
