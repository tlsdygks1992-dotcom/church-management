'use client'

import { useState, useCallback } from 'react'
import ServiceWorkerRegistration from './ServiceWorkerRegistration'

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  const handleUpdateAvailable = useCallback(() => {
    setShowPrompt(true)
  }, [])

  const handleRefresh = useCallback(() => {
    // SW에 skipWaiting 메시지 전송 후 새로고침
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('SKIP_WAITING')
    }
    window.location.reload()
  }, [])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
  }, [])

  return (
    <>
      <ServiceWorkerRegistration onUpdateAvailable={handleUpdateAvailable} />

      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-sm font-medium">새 버전이 있습니다</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white text-sm px-2 py-1"
              >
                나중에
              </button>
              <button
                onClick={handleRefresh}
                className="bg-white text-blue-600 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
