const CACHE_NAME = 'signage-cache-v1';

// Intercepta peticiones de imágenes y las cachea
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Solo cachear imágenes válidas
        if (event.request.destination === 'image' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // En caso de fallo de red total
        return caches.match(event.request);
      });
    })
  );
});