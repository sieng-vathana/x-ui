// Offline shell for the portal. Keeps the built app so the POS can load without a connection.
// The API is never cached: POS data is kept by the app itself (see src/lib/offlineCache.ts).
const CACHE = 'tinhluk-shell-v3'
const SHELL = '/'

// Saved as soon as the worker installs, so the app works offline even on the first offline visit.
self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()))
})

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
  // Page loads (any route, e.g. /pos): fresh when online, the saved app when offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  }
})

async function precacheShell() {
  const cache = await caches.open(CACHE)
  const page = await fetch(SHELL, { cache: 'no-cache' })
  if (!page.ok) throw new Error('The app shell could not be saved.')
  const html = await page.text()
  await cache.put(SHELL, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]))]
  await cache.addAll(assets)
  // Icon fonts are loaded by the stylesheets, not the page, so their files are saved from the CSS too.
  const fonts = []
  for (const asset of assets.filter((url) => url.endsWith('.css'))) {
    const response = (await cache.match(asset)) ?? (await fetch(asset))
    const css = await response.text()
    for (const match of css.matchAll(/url\(\s*["']?(\/assets\/[^"')\s]+)/g)) fonts.push(match[1])
  }
  await cache.addAll([...new Set(fonts)])
}

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
