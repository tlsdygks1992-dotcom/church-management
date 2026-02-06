'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

const supabase = createClient()

/** 알림 목록 조회 */
export function useNotifications(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async (): Promise<Notification[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    refetchInterval: 30 * 1000, // 30초마다 리페치
  })
}

/** 읽지 않은 알림 수 */
export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      if (error) throw error
      return count || 0
    },
    enabled: !!userId,
    refetchInterval: 30 * 1000,
  })
}

/** 알림 읽음 처리 mutation */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (notificationIds.length === 0) return
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/** 모두 읽음 처리 mutation */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
