// Include the scope so other GitHub Pages projects on this origin keep their caches.
const CACHE_PREFIX = `chromasample:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}v8`;
const FILES = [
  './', './index.html', './style.css', './app.js', './audio-utils.js',
  './keyboard.js', './performance.js', './scales.js', './capture.js', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE)
    .then(cache => cache.match(event.request))
    .then(cached => cached || fetch(event.request)));
});
