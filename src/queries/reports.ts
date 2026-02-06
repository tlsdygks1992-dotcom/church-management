'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ReportSummary } from '@/types/shared'

const supabase = createClient()

/** 보고서 목록 조회 */
export function useReports(options?: {
  departmentId?: string
  status?: string
  type?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['reports', options],
    queryFn: async (): Promise<ReportSummary[]> => {
      let query = supabase
        .from('weekly_reports')
        .select('id, report_date, week_number, status, departments(name), users!weekly_reports_author_id_fkey(name)')
        .order('report_date', { ascending: false })

      if (options?.departmentId) {
        query = query.eq('department_id', options.departmentId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as ReportSummary[]
    },
  })
}
