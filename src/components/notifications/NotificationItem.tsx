'use client'

import { useRouter } from 'next/navigation'
import type { Notification } from '@/types/database'

interface NotificationItemProps {
  notification: Notification
  onRead?: (id: string) => void
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter()

  const handleClick = () => {
    // 읽음 처리
    if (!notification.is_read && onRead) {
      onRead(notification.id)
    }

    // 링크가 있으면 이동
    if (notification.link) {
      router.push(notification.link)
    }
  }

  // 상대 시간 포맷
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  // 알림 타입에 따른 아이콘
  const getIcon = () => {
    const title = notification.title
    if (title.includes('제출')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    if (title.includes('반려')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    if (title.includes('승인') || title.includes('완료')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  }

  // 아이콘 배경색
  const getIconBgClass = () => {
    const title = notification.title
    if (title.includes('반려')) return 'bg-red-100 text-red-600'
    if (title.includes('승인') || title.includes('완료')) return 'bg-green-100 text-green-600'
    return 'bg-blue-100 text-blue-600'
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors rounded-xl ${
        notification.is_read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50/50 hover:bg-blue-50'
      }`}
    >
      {/* 읽지 않음 표시 */}
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBgClass()}`}>
          {getIcon()}
        </div>
        {!notification.is_read && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  )
}
