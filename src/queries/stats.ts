'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  computeDepartmentStats,
  computeWeeklyTrend,
  getStartDate,
  type DepartmentStats,
  type WeeklyStats,
} from '@/lib/stats-queries'

const supabase = createClient()

interface Department {
  id: string
  name: string
  code: string
}

type Period = 'month' | 'quarter' | 'year'

/** 부서별 출결 통계 */
export function useDepartmentStats(departments: Department[], period: Period) {
  return useQuery({
    queryKey: ['stats', 'departments', period, departments.map(d => d.id)],
    queryFn: async (): Promise<DepartmentStats[]> => {
      const startDate = getStartDate(period)
      return computeDepartmentStats(supabase, departments, startDate, period)
    },
    enabled: departments.length > 0,
    staleTime: 2 * 60_000,
  })
}

/** 주간 출석 추이 */
export function useWeeklyTrend(selectedDept: string, selectedCell: string, period: Period) {
  return useQuery({
    queryKey: ['stats', 'weekly', selectedDept, selectedCell, period],
    queryFn: async (): Promise<WeeklyStats[]> => {
      const startDate = getStartDate(period)
      return computeWeeklyTrend(supabase, selectedDept, selectedCell, startDate)
    },
    staleTime: 2 * 60_000,
  })
}

export type { DepartmentStats, WeeklyStats }
