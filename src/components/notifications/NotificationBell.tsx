'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationItem from './NotificationItem'
import type { Notification } from '@/types/database'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 알림 목록 조회
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    fetchNotifications()

    // Supabase 실시간 구독
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
          // 읽음 처리 된 경우 카운트 감소
          if (updated.is_read && !payload.old?.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchNotifications])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 개별 알림 읽음 처리
  const handleRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // 모두 읽음 처리
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      })
      if (res.ok) {
        setUnreadCount(0)
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="알림"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto max-h-[calc(70vh-56px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">알림이 없습니다</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
