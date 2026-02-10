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
  title: string
  report_date: string
  status: string
  created_at: string
  departments: { name: string; code: string } | null
  users: { name: string } | null
}

const REPORT_SELECT = `
  id, title, report_date, status, created_at,
  departments(name, code),
  users!weekly_reports_author_id_fkey(name)
`

function transformReports(data: unknown[]): ApprovalReport[] {
  return data.map((item: unknown) => {
    const row = item as Record<string, unknown>
    return {
      id: row.id as string,
      title: row.title as string,
      report_date: row.report_date as string,
      status: row.status as string,
      created_at: row.created_at as string,
      departments: Array.isArray(row.departments) ? row.departments[0] : row.departments,
      users: Array.isArray(row.users) ? row.users[0] : row.users,
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
    staleTime: 30_000,
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
    staleTime: 30_000,
  })
}
