'use client'

import { useState, useEffect, useCallback } from 'react'

interface PushPermissionProps {
  userId: string
}

/**
 * 푸시 알림 권한 요청 + 구독 등록/해제 컴포넌트
 * NotificationBell 드롭다운 내부에 배치
 */
export default function PushPermission({ userId }: PushPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // 현재 상태 확인
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    // 이미 구독 중인지 확인
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }
  }, [])

  // 구독 등록
  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) {
        console.error('VAPID public key not found')
        setLoading(false)
        return
      }

      // URL-safe base64를 Uint8Array로 변환
      const applicationServerKey = urlBase64ToUint8Array(vapidKey)

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })

      const subJson = subscription.toJSON()

      // 서버에 구독 정보 저장
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 구독 해제
  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        // 서버에서 구독 해제
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 지원하지 않는 경우 (iOS Safari 등)
  if (permission === 'unsupported') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    return (
      <div className="px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100 text-center space-y-1">
        <p className="font-medium text-gray-600">푸시 알림을 사용할 수 없습니다</p>
        {isIOS ? (
          <p className="text-[11px] leading-relaxed">
            Safari 하단 <span className="inline-block align-middle">
              <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </span> 버튼 → <strong>&quot;홈 화면에 추가&quot;</strong>로<br />앱을 설치하면 푸시 알림을 받을 수 있어요
          </p>
        ) : (
          <p className="text-[11px]">Chrome 또는 Edge 브라우저에서 사용 가능합니다</p>
        )}
      </div>
    )
  }
  if (permission === 'denied') {
    return (
      <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
        알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.
      </div>
    )
  }

  return (
    <div className="px-4 py-2 border-t border-gray-100">
      {isSubscribed ? (
        <button
          onClick={unsubscribe}
          disabled={loading}
          className="w-full text-xs text-gray-500 hover:text-red-500 py-1 transition-colors disabled:opacity-50"
        >
          {loading ? '처리 중...' : '푸시 알림 끄기'}
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1 transition-colors disabled:opacity-50"
        >
          {loading ? (
            '처리 중...'
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              푸시 알림 켜기
            </>
          )}
        </button>
      )}
    </div>
  )
}

// URL-safe base64 → Uint8Array 변환
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
