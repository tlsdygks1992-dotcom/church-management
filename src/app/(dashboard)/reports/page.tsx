import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportListClient from '@/components/reports/ReportListClient'

type ReportType = 'weekly' | 'meeting' | 'education'

interface SearchParams {
  type?: string
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 사용자 정보와 부서 목록 병렬 로드
  const [userResult, deptResult] = await Promise.all([
    supabase
      .from('users')
      .select('role, department_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
      .order('name')
  ])

  const userData = userResult.data
  const departments = deptResult.data || []

  // 권한 체크
  const adminRoles = ['super_admin', 'president', 'accountant']
  const isAdmin = adminRoles.includes(userData?.role || '')
  const canWriteReport = isAdmin || userData?.role === 'team_leader'

  // 초기 보고서 데이터 로드
  const selectedType = (params.type as ReportType) || 'weekly'

  let query = supabase
    .from('weekly_reports')
    .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
    .eq('report_type', selectedType)
    .order('report_date', { ascending: false })
    .limit(50)

  // 관리자가 아닌 경우 자기 부서만
  if (!isAdmin && userData?.department_id) {
    query = query.eq('department_id', userData.department_id)
  }

  const { data: reports } = await query

  return (
    <ReportListClient
      initialReports={reports || []}
      departments={departments}
      isAdmin={isAdmin}
      canWriteReport={canWriteReport}
      userDepartmentId={userData?.department_id || null}
    />
  )
}
