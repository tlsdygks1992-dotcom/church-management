'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
import type { ReportSummary } from '@/types/shared'

const supabase = createClient()

// 이번 주 일요일 계산
function getThisSunday(): string {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  return toLocalDateString(sunday)
}

/** 최근 보고서 5건 */
export function useRecentReports() {
  return useQuery({
    queryKey: ['dashboard', 'recentReports'],
    queryFn: async (): Promise<ReportSummary[]> => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return (data || []) as ReportSummary[]
    },
    staleTime: 30 * 1000,
  })
}

/** 이번 주 내 보고서 작성 여부 */
export function useThisWeekReport(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'thisWeekReport', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('id, status')
        .eq('report_date', getThisSunday())
        .eq('author_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as { id: string; status: string } | null
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/** 역할별 결재 대기 보고서 */
export function useDashboardPending(userRole: string | undefined) {
  const pendingStatusMap: Record<string, string> = {
    president: 'submitted',
    accountant: 'coordinator_reviewed',
    super_admin: 'manager_approved',
  }
  const pendingStatus = userRole ? pendingStatusMap[userRole] || '' : ''

  return useQuery({
    queryKey: ['dashboard', 'pending', userRole],
    queryFn: async (): Promise<ReportSummary[]> => {
      if (!pendingStatus) return []
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
        .eq('status', pendingStatus)
        .order('report_date', { ascending: false })
      if (error) throw error
      return (data || []) as ReportSummary[]
    },
    enabled: !!pendingStatus,
    staleTime: 30 * 1000,
  })
}

/** 이번 주 출석 통계 (재적/예배/모임) */
export function useThisWeekStats(userDeptIds: string[]) {
  const sundayStr = getThisSunday()

  return useQuery({
    queryKey: ['dashboard', 'thisWeekStats', userDeptIds, sundayStr],
    queryFn: async () => {
      if (userDeptIds.length === 0) return { total: 0, worship: 0, meeting: 0 }

      const [membersResult, attendanceResult] = await Promise.all([
        supabase
          .from('members')
          .select('id', { count: 'exact' })
          .in('department_id', userDeptIds)
          .eq('is_active', true),
        supabase
          .from('attendance_records')
          .select('member_id, attendance_type')
          .eq('attendance_date', sundayStr)
          .eq('is_present', true),
      ])

      const members = (membersResult.data || []) as { id: string }[]
      const memberIds = new Set(members.map(m => m.id))
      const attendance = ((attendanceResult.data || []) as { member_id: string; attendance_type: string }[])
        .filter(a => memberIds.has(a.member_id))

      const totalCount = 'count' in membersResult ? (membersResult.count as number | null) : null

      return {
        total: totalCount || members.length,
        worship: attendance.filter(a => a.attendance_type === 'worship').length,
        meeting: attendance.filter(a => a.attendance_type === 'meeting').length,
      }
    },
    enabled: userDeptIds.length > 0,
    staleTime: 60 * 1000,
  })
}
