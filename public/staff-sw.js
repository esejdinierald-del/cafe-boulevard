// Staff Service Worker for Web Push Notifications
// This runs independently of the page — receives push even when tab is closed

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: '🔔 Thirrje e re!', body: 'Ke një kërkesë të re', type: 'service' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Push data parse error:', e);
  }

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `staff-push-${Date.now()}`,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 500],
    data: { url: '/staff', type: data.type },
    actions: [
      { action: 'open', title: 'Hap' },
      { action: 'dismiss', title: 'Mbyll' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => {
    return new Response("Offline", { status: 503 });
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (client.url.includes('/staff') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow('/staff');
    })
  );
});
