/* Red Belt — offline cache.
   The page itself is fetched network-first, so an update on GitHub shows up
   the next time the app opens. Icons and the manifest stay cache-first. */
var CACHE = 'redbelt-v4';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isPage(req) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') > -1;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  if (isPage(e.request)) {
    // network first — always try for the newest game
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put('./index.html', copy);
        }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // everything else — cache first
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(e.request, copy);
        }).catch(function () {});
        return res;
      });
    })
  );
});
