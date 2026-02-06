'use client'

import type { Toast as ToastType } from '@/hooks/useToast'

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: string) => void
}

const typeStyles: Record<string, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right ${typeStyles[toast.type]}`}
        >
          <span className="text-sm font-medium shrink-0">{typeIcons[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-current opacity-50 hover:opacity-100 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
