/* Service Worker — Tatiana Hernández · Estética Integral
   Hace que el sitio abra rápido y funcione incluso sin conexión.
   Al publicar una versión nueva, sube el número de CACHE (v1 -> v2 ...). */
const CACHE = 'th-estetica-v5';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './fonts/cormorant-400.woff2',
  './fonts/cormorant-500.woff2',
  './fonts/cormorant-600.woff2',
  './fonts/cormorant-700.woff2',
  './fonts/cormorant-400i.woff2',
  './fonts/cormorant-500i.woff2',
  './fonts/jost-300.woff2',
  './fonts/jost-400.woff2',
  './fonts/jost-500.woff2',
  './fonts/jost-600.woff2',
  './fonts/pinyon-400.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navegaciones (abrir la página): intenta la red y, si falla, sirve la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de recursos: primero la caché; si no está, va a la red y guarda una copia.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
