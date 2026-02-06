'use client'

import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

/** 토스트 알림을 관리하는 훅 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, message, type }])

    // 3초 후 자동 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast])

  return { toasts, addToast, removeToast, success, error, info, warning }
}
