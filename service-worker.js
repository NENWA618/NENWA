const CACHE_NAME = 'nenwa-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './NENWA.png',
  './oyakodon.HTML',
  './tendon.HTML',
  './gyuudon.HTML',
  './katsudon.HTML',
  './yakisoba.HTML',
  './yakiudon.HTML',
  './kakeudon.HTML',
  './tacorice.HTML',
  './makunouchibentou.HTML',
  './noriben.HTML',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.css',
  'https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.js',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@300;500&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          response => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});