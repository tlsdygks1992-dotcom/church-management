import { createClient } from '@/lib/supabase/server'
import StatsClient from '@/components/stats/StatsClient'
import {
  computeDepartmentStats,
  computeWeeklyTrend,
  getStartDate,
} from '@/lib/stats-queries'

export default async function StatsPage() {
  const supabase = await createClient()

  // 부서 목록 조회
  const { data: deptData } = await supabase
    .from('departments')
    .select('id, name, code')
    .order('name')

  const departments = (deptData || []) as { id: string; name: string; code: string }[]

  // 초기 통계 계산 (월간, 전체 부서)
  const startDate = getStartDate('month')

  const [departmentStats, weeklyStats] = await Promise.all([
    computeDepartmentStats(supabase, departments, startDate, 'month'),
    computeWeeklyTrend(supabase, 'all', 'all', startDate),
  ])

  return (
    <StatsClient
      departments={departments}
      initialDepartmentStats={departmentStats}
      initialWeeklyStats={weeklyStats}
    />
  )
}
