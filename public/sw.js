// Service Worker for 청파중앙교회 교육위원회 관리 시스템
const CACHE_VERSION = 'v1.2.0'
const CACHE_NAME = `church-app-${CACHE_VERSION}`
const STATIC_CACHE = `church-static-${CACHE_VERSION}`
const API_CACHE = `church-api-${CACHE_VERSION}`

// 캐시할 정적 자산
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
]

// 설치 이벤트 - 정적 자산 캐싱
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION)

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        // 개별 캐싱 (일부 실패해도 SW 설치 진행)
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch(() => {
            console.warn('[SW] Failed to cache:', url)
          }))
        )
      })
      .then(() => {
        // 즉시 활성화 (대기 상태 건너뛰기)
        return self.skipWaiting()
      })
  )
})

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION)

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('church-') &&
                     name !== CACHE_NAME &&
                     name !== STATIC_CACHE &&
                     name !== API_CACHE
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        // 모든 클라이언트 즉시 제어
        return self.clients.claim()
      })
  )
})

// Fetch 이벤트 - 캐싱 전략
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Next.js 정적 번들 - Cache First (불변 파일)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 이미지 및 폰트 - Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Supabase API - Stale While Revalidate
  if (url.hostname.includes('supabase')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // 내부 API - Stale While Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // HTML 페이지 - Network First (최신 콘텐츠 보장)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, CACHE_NAME))
    return
  }

  // 기타 요청은 네트워크 우선
  event.respondWith(networkFirst(request, CACHE_NAME))
})

// 네트워크 우선 전략
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)

    // 성공한 응답만 캐시
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // 오프라인이고 캐시도 없는 경우
    throw error
  }
}

// 캐시 우선 전략 (정적 자산용)
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    throw error
  }
}

// Stale While Revalidate 전략 (API용)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // 백그라운드에서 새 응답 가져오기
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(() => {
      // 네트워크 오류 무시 - 캐시 응답 사용
      return null
    })

  // 캐시가 있으면 즉시 반환, 없으면 네트워크 대기
  if (cachedResponse) {
    return cachedResponse
  }

  const networkResponse = await fetchPromise
  if (networkResponse) {
    return networkResponse
  }

  // 둘 다 실패한 경우
  throw new Error('No cached or network response available')
}

// 정적 자산 여부 확인
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.webp']
  return staticExtensions.some(ext => pathname.endsWith(ext))
}

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: '새 알림', body: event.data.text() }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { link: data.link || '/' },
    vibrate: [200, 100, 200],
    tag: 'church-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '청파중앙교회', options)
  )
})

// 푸시 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const link = event.notification.data?.link || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // 이미 열린 탭이 있으면 포커스 + 이동
        for (const client of clients) {
          if ('focus' in client) {
            client.focus()
            client.navigate(link)
            return
          }
        }
        // 열린 탭이 없으면 새 창 열기
        return self.clients.openWindow(link)
      })
  )
})

// 클라이언트에게 업데이트 메시지 전송
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

