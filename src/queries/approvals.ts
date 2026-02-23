'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const ROLE_STATUS_MAP: Record<string, string> = {
  super_admin: 'manager_approved',
  president: 'submitted',
  accountant: 'coordinator_reviewed',
}

export interface ApprovalReport {
  id: string
  meeting_title: string | null
  report_date: string
  status: string
  created_at: string
  departments: { name: string; code: string } | null
  users: { name: string } | null
}

const REPORT_SELECT = `
  *,
  departments(name, code),
  users!weekly_reports_author_id_fkey(name)
`

/** 결재 대기 보고서 조회 */
export function usePendingReports(userRole: string) {
  return useQuery({
    queryKey: ['approvals', 'pending', userRole, 'v2'], // 대시보드와 동일한 v2 키 사용
    queryFn: async (): Promise<any[]> => {
      if (!userRole) return []

      let query = supabase
        .from('weekly_reports')
        .select('*, departments(name, code), users!weekly_reports_author_id_fkey(name)')

      if (userRole === 'super_admin') {
        query = query.in('status', ['submitted', 'coordinator_reviewed', 'manager_approved'])
      } else if (userRole === 'president') {
        query = query.eq('status', 'submitted')
      } else if (userRole === 'accountant') {
        query = query.eq('status', 'coordinator_reviewed')
      } else {
        return []
      }

      const { data, error } = await query
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Pending reports fetch error:', error)
        throw error
      }
      return data || []
    },
    enabled: !!userRole,
    staleTime: 0,
  })
}

/** 처리 완료 보고서 조회 */
export function useCompletedReports(userRole: string) {
  return useQuery({
    queryKey: ['approvals', 'completed', userRole],
    queryFn: async (): Promise<ApprovalReport[]> => {
      let query = supabase
        .from('weekly_reports')
        .select(REPORT_SELECT)
        .order('created_at', { ascending: false })
        .limit(20)

      if (userRole === 'super_admin') {
        query = query.eq('status', 'final_approved')
      } else if (userRole === 'president') {
        query = query.in('status', ['coordinator_reviewed', 'manager_approved', 'final_approved'])
      } else if (userRole === 'accountant') {
        query = query.in('status', ['manager_approved', 'final_approved'])
      }

      const { data, error } = await query
      if (error) throw error
      return transformReports(data || [])
    },
    enabled: !!userRole,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
