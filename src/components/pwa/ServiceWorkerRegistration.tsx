'use client'

import { useEffect, useRef } from 'react'

interface ServiceWorkerRegistrationProps {
  onUpdateAvailable?: () => void
}

export default function ServiceWorkerRegistration({
  onUpdateAvailable
}: ServiceWorkerRegistrationProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let registration: ServiceWorkerRegistration | null = null

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('[PWA] Service Worker 등록 완료:', registration.scope)

        // 업데이트 감지
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing

          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // 새 SW가 설치 완료되고, 이전 SW가 있는 경우 = 업데이트
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] 새 버전 감지됨')
              onUpdateAvailable?.()
            }
          })
        })

        // 주기적 업데이트 확인 (1시간마다) - cleanup 가능하도록 ref에 저장
        intervalRef.current = setInterval(() => {
          registration?.update()
        }, 60 * 60 * 1000)

      } catch (error) {
        console.error('[PWA] Service Worker 등록 실패:', error)
      }
    }

    registerServiceWorker()

    // 페이지 포커스 시 업데이트 확인 (visibilitychange는 bfcache 호환)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.update()
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup: interval과 이벤트 리스너 정리 (bfcache 호환)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [onUpdateAvailable])

  return null
}
