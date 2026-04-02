// ============================================================
//  MyLunaPark - Service Worker (PWA)
//  Caching offline-first per risorse statiche
// ============================================================

const CACHE_NAME  = 'mylunapark-v2';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/map.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/parks.js',
  '/js/coupons.js',
  '/js/sponsors.js',
  '/js/utils.js',
  '/js/qr.js',
  '/js/app.js',
  '/manifest.json'
];

// ---- INSTALL: pre-cache risorse statiche ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_URLS).catch(err => {
        console.warn('Alcuni file non cached:', err);
      });
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE: rimuovi vecchie cache ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- FETCH: strategia network-first per API, cache-first per statici ----
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ignora richieste non GET e richieste Firebase/CDN
  if (event.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('identitytoolkit') ||
      url.includes('googleapis.com')) return;

  // Risorse statiche: cache-first
  if (url.includes('/css/') || url.includes('/js/') || url.endsWith('.html') || url.endsWith('.json')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // CDN risorse (font, leaflet, qrcode, ecc): stale-while-revalidate
  if (url.includes('cdn.') || url.includes('fonts.') || url.includes('gstatic')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// ---- PUSH NOTIFICATIONS (base) ----
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'MyLunaPark', {
      body:  data.body  || 'Hai nuovi coupon disponibili!',
      icon:  data.icon  || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      data:  data.url   || '/'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data || '/');
    })
  );
});
