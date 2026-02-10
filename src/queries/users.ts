'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface UserRecord {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
  department_id: string | null
  departments: { name: string } | null
}

/** 전체 사용자 목록 (관리자용) */
export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async (): Promise<UserRecord[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('*, departments(name)')
        .order('is_active', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as UserRecord[]
    },
    staleTime: 30 * 1000,
  })
}
