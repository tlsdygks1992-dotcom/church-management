import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportListClient from '@/components/reports/ReportListClient'
import { canAccessAllDepartments } from '@/lib/permissions'

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

  // 사용자 정보(user_departments 포함)와 부서 목록 병렬 로드
  const [userResult, deptResult] = await Promise.all([
    supabase
      .from('users')
      .select('role, user_departments(department_id, is_team_leader, departments(id, name, code))')
      .eq('id', user.id)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
      .order('name')
  ])

  const userData = userResult.data
  const allDepartments = deptResult.data || []

  // 권한 체크
  const isAdmin = canAccessAllDepartments(userData?.role || '')
  const isTeamLeader = userData?.user_departments?.some((ud: { is_team_leader: boolean }) => ud.is_team_leader)
  const canWriteReport = isAdmin || userData?.role === 'team_leader' || !!isTeamLeader

  // 소속 부서 ID 배열
  const userDepartmentIds = userData?.user_departments?.map((ud: { department_id: string }) => ud.department_id) || []

  // 비관리자에게 보여줄 부서 목록
  const filteredDepartments = isAdmin
    ? allDepartments
    : allDepartments.filter(d => userDepartmentIds.includes(d.id))

  // 초기 보고서 데이터 로드
  const selectedType = (params.type as ReportType) || 'weekly'

  let query = supabase
    .from('weekly_reports')
    .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
    .eq('report_type', selectedType)
    .order('report_date', { ascending: false })
    .limit(50)

  // 관리자가 아닌 경우 소속 부서만
  if (!isAdmin && userDepartmentIds.length > 0) {
    query = query.in('department_id', userDepartmentIds)
  }

  const { data: reports } = await query

  return (
    <ReportListClient
      initialReports={reports || []}
      departments={filteredDepartments}
      isAdmin={isAdmin}
      canWriteReport={canWriteReport}
      userDepartmentIds={userDepartmentIds}
    />
  )
}
