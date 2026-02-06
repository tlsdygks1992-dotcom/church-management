'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import ToastContainer from '@/components/ui/Toast'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, message, type }])
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

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

/** 글로벌 토스트 알림 훅 */
export function useToastContext() {
  return useContext(ToastContext)
}
