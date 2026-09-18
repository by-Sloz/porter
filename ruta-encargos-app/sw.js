const CACHE_NAME = 'ruta-encargos-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(()=>{}) // si algo falla al precachear, no bloquea la instalación
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // No interceptar peticiones externas (fuentes de Google, wa.me, mapas, etc.):
  // que sigan su camino normal, ya sea por red o fallando si no hay conexión.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // El documento HTML: intenta obtener la versión más reciente por red;
    // si no hay conexión, usa la última copia guardada.
    event.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Archivos propios (manifest, íconos): primero la copia guardada, red de respaldo.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copia = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
      return res;
    }))
  );
});
