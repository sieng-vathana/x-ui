// Offline shell for the portal. Caches the built app so a page reload works without a connection.
// The API is never cached: POS data is kept by the app itself (see src/lib/offlineCache.ts).
const CACHE = 'tinhluk-shell-v1'
const SHELL = '/'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Built files have content hashes in their names, so a cached copy never goes stale.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }
  // Page loads: fresh when online, the last copy of the app when offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  }
})

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(SHELL, response.clone())
    return response
  } catch {
    return (await cache.match(SHELL)) ?? Response.error()
  }
}
