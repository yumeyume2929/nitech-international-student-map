const CACHE_VERSION = 'nitech-life-map-pwa-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/leaflet.css',
  './css/MarkerCluster.css',
  './css/MarkerCluster.Default.css',
  './css/L.Control.Locate.min.css',
  './css/fontawesome-all.min.css',
  './css/app.css',
  './css/mobile-fix-v5.css',
  './css/pwa.css',
  './js/leaflet.js',
  './js/leaflet.markercluster.js',
  './js/L.Control.Locate.min.js',
  './js/app-mobile-v5.js',
  './js/pwa-install.js',
  './data/facilities-v5.js',
  './webfonts/fa-solid-900.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : Response.error());
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Do not cache OpenStreetMap/Google resources.

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  if (url.pathname.endsWith('/data/facilities-v5.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const update = fetch(request).then(response => {
        if (response && response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || update;
    })
  );
});
