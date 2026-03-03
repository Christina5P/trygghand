const CACHE_NAME = 'trygg-hand-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/handplockat',
  '/handplockat.jpg',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/handplockat-favicon-16x16.png',
  '/handplockat-favicon-32x32.png',
  '/handplockat-favicon-192x192.png',
  '/handplockat-favicon-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Silently fail if assets can't be cached (network might be down during install)
        console.log('Some assets could not be cached during install');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Chrome sometimes dispatches requests with cache=only-if-cached + mode=no-cors.
  // Responding to those from a SW can throw and break the page.
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  // Avoid interfering with Vite dev server / HMR traffic if a SW is present.
  // (SW registration is gated to PROD, but this protects against stale SWs.)
  const url = new URL(event.request.url);

  // Some browser extensions trigger requests with non-http(s) schemes (e.g. chrome-extension://).
  // Cache API does not support those, and trying to cache them can crash the SW.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Do not intercept cross-origin requests (e.g. Supabase signed URLs, analytics, extensions).
  // Keeping SW scope to same-origin avoids a class of caching/fetch edge-cases.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/src') || url.pathname.includes('hot-update')) {
    return;
  }

  // Skip API calls - let them fail naturally if offline
  if (event.request.url.includes('/api/')) {
    return;
  }

  const isNavigationRequest = event.request.mode === 'navigate';

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);

      // Only cache successful responses
      if (response && response.status === 200) {
        const clonedResponse = response.clone();
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, clonedResponse);
        } catch {
          // Ignore cache errors (quota, unsupported requests, etc.)
        }
      }

      return response;
    } catch {
      if (isNavigationRequest) {
        const appShell = await caches.match('/index.html');
        if (appShell) return appShell;
      }

      // Return cached version if network fails
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || new Response('Offline - denna resurs är inte tillgänglig offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/plain'
        })
      });
    }
  })());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Ny uppdatering',
    body: 'Du har en uppdatering i kundportalen.',
    icon: '/favicon-192x192.png',
    badge: '/favicon-96x96.png',
    url: '/portal',
    type: 'case_update',
  };

  try {
    const parsed = event.data ? event.data.json() : null;
    if (parsed && typeof parsed === 'object') {
      payload = {
        ...payload,
        ...parsed,
        url: typeof parsed.url === 'string' && parsed.url.startsWith('/portal') ? parsed.url : '/portal',
      };
    }
  } catch {
    // ignore invalid push payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: {
        url: payload.url,
        type: payload.type,
      },
      tag: `trygghand-${payload.type || 'push'}`,
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath =
    event.notification?.data?.url && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : '/portal';

  const absoluteUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }

      return Promise.resolve();
    })
  );
});
