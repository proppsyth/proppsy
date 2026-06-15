const CACHE = 'proppsy-v4'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  // Let the browser handle page navigations directly — avoids blocking on
  // SSR compilation (dev mode) and opaque-redirect issues with Next.js routes.
  if (e.request.mode === 'navigate') return
  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return
  // Skip Next.js RSC / router data fetches — these must reach the server directly
  // so App Router client-side navigation doesn't hang waiting on the SW.
  if (url.searchParams.has('_rsc')) return
  if (url.pathname.startsWith('/_next/data/')) return

  // Cache-first for static assets; network-first for everything else
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/fonts') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return res
        })
      })
    )
  } else {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(cached =>
          cached ?? new Response('Network unavailable', { status: 503 })
        )
      )
    )
  }
})

// ─── Web Push ────────────────────────────────────────────────

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch { data = { title: 'Proppsy' } }

  const title   = data.title   || 'Proppsy'
  const body    = data.message || data.body || ''
  const url     = data.url     || '/'
  const icon    = '/logo/logo-icon.jpg'

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      data:  { url },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'

  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Focus an existing tab pointing to this origin
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            return client.navigate(url)
          }
        }
        // No open tab — open a new one
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
