'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ReportSummary } from '@/types/shared'
import type { WeeklyReport, ReportProgram, Newcomer, ApprovalHistory } from '@/types/database'

const supabase = createClient()

// ─── 보고서 목록 아이템 타입 ────────────────────────

export interface ReportListItem {
  id: string
  author_id: string
  department_id: string
  report_date: string
  week_number: number
  status: string
  report_type: string
  worship_attendance: number
  total_registered: number
  meeting_title: string | null
  departments: { name: string } | null
  users: { name: string } | null
}

// ─── 보고서 상세 타입 ──────────────────────────────

type ReportType = 'weekly' | 'meeting' | 'education'

export interface ReportDetailData extends WeeklyReport {
  report_type: ReportType
  meeting_title: string | null
  meeting_location: string | null
  attendees: string | null
  main_content: string | null
  application_notes: string | null
  departments: { name: string; code?: string } | null
  users: { name: string } | null
  coordinator: { name: string } | null
  manager: { name: string } | null
  final_approver: { name: string } | null
}

export type ApprovalHistoryWithUser = ApprovalHistory & { users: { name: string } | null }

// ─── 보고서 상세 훅 ──────────────────────────────

const REPORT_DETAIL_SELECT = `
  *,
  departments(name, code),
  users!weekly_reports_author_id_fkey(name),
  coordinator:users!weekly_reports_coordinator_id_fkey(name),
  manager:users!weekly_reports_manager_id_fkey(name),
  final_approver:users!weekly_reports_final_approver_id_fkey(name)
`

/** 보고서 상세 조회 */
export function useReportDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: async (): Promise<ReportDetailData | null> => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select(REPORT_DETAIL_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as ReportDetailData | null
    },
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** 보고서 프로그램 목록 */
export function useReportPrograms(reportId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'programs', reportId],
    queryFn: async (): Promise<ReportProgram[]> => {
      const { data, error } = await supabase
        .from('report_programs')
        .select('*')
        .eq('report_id', reportId!)
        .order('order_index')
      if (error) throw error
      return (data || []) as ReportProgram[]
    },
    enabled: !!reportId,
    staleTime: 30_000,
  })
}

/** 보고서 새신자 목록 */
export function useReportNewcomers(reportId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'newcomers', reportId],
    queryFn: async (): Promise<Newcomer[]> => {
      const { data, error } = await supabase
        .from('newcomers')
        .select('*')
        .eq('report_id', reportId!)
      if (error) throw error
      return (data || []) as Newcomer[]
    },
    enabled: !!reportId,
    staleTime: 30_000,
  })
}

/** 결재 이력 조회 */
export function useApprovalHistory(reportId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'history', reportId],
    queryFn: async (): Promise<ApprovalHistoryWithUser[]> => {
      const { data, error } = await supabase
        .from('approval_history')
        .select('*, users(name)')
        .eq('report_id', reportId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as ApprovalHistoryWithUser[]
    },
    enabled: !!reportId,
    staleTime: 30_000,
  })
}

/** 특정 부서에서 is_team_leader=true인 사용자 ID 목록 조회 */
export function useTeamLeaderIds(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['team-leaders', departmentId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('user_departments')
        .select('user_id')
        .eq('department_id', departmentId!)
        .eq('is_team_leader', true)
      if (error) throw error
      return (data || []).map((d: { user_id: string }) => d.user_id)
    },
    enabled: !!departmentId,
    staleTime: 5 * 60_000, // 5분 캐싱
  })
}

/** 보고서 목록 조회 */
export function useReports(options?: {
  departmentId?: string
  departmentIds?: string[]
  status?: string
  reportType?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['reports', 'list', options],
    queryFn: async (): Promise<ReportListItem[]> => {
      let query = supabase
        .from('weekly_reports')
        .select('id, author_id, department_id, report_date, week_number, status, report_type, worship_attendance, total_registered, meeting_title, departments(name), users!weekly_reports_author_id_fkey(name)')
        .order('report_date', { ascending: false })

      if (options?.reportType) {
        query = query.eq('report_type', options.reportType)
      }
      if (options?.departmentId && options.departmentId !== 'all') {
        query = query.eq('department_id', options.departmentId)
      } else if (options?.departmentIds && options.departmentIds.length > 0) {
        query = query.in('department_id', options.departmentIds)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      query = query.limit(options?.limit || 50)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as ReportListItem[]
    },
    staleTime: 2 * 60_000, // 2분 캐싱
    placeholderData: keepPreviousData,
  })
}

/** 부서별 팀장 ID 맵 조회 (복수 부서) */
export function useTeamLeaderMap(departmentIds: string[]) {
  return useQuery({
    queryKey: ['team-leaders', 'map', departmentIds],
    queryFn: async (): Promise<Record<string, string[]>> => {
      const { data, error } = await supabase
        .from('user_departments')
        .select('department_id, user_id')
        .in('department_id', departmentIds)
        .eq('is_team_leader', true)
      if (error) throw error
      const map: Record<string, string[]> = {}
      for (const row of (data || []) as { department_id: string; user_id: string }[]) {
        if (!map[row.department_id]) map[row.department_id] = []
        map[row.department_id].push(row.user_id)
      }
      return map
    },
    enabled: departmentIds.length > 0,
    staleTime: 5 * 60_000,
  })
}
