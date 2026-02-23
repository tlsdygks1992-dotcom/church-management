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
  id, meeting_title, report_date, status, created_at,
  departments(name, code),
  users!weekly_reports_author_id_fkey(name)
`

function transformReports(data: any[]): ApprovalReport[] {
  return data.map((item: any) => {
    return {
      id: item.id,
      meeting_title: item.meeting_title,
      report_date: item.report_date,
      status: item.status,
      created_at: item.created_at,
      departments: Array.isArray(item.departments) ? item.departments[0] : item.departments,
      users: Array.isArray(item.users) ? item.users[0] : item.users,
    }
  })
}

/** 결재 대기 보고서 조회 */
export function usePendingReports(userRole: string) {
  return useQuery({
    queryKey: ['approvals', 'pending', userRole],
    queryFn: async (): Promise<ApprovalReport[]> => {
      let query

      if (userRole === 'super_admin') {
        query = supabase
          .from('weekly_reports')
          .select(REPORT_SELECT)
          .in('status', ['submitted', 'coordinator_reviewed', 'manager_approved'])
          .order('created_at', { ascending: false })
      } else {
        const pendingStatus = ROLE_STATUS_MAP[userRole]
        query = supabase
          .from('weekly_reports')
          .select(REPORT_SELECT)
          .eq('status', pendingStatus || 'submitted')
          .order('created_at', { ascending: false })
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
