import { createClient } from '@/lib/supabase/server'
import DashboardContent from '@/components/dashboard/DashboardContent'
import type { UserData, ReportSummary } from '@/types/shared'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 이번 주 일요일 계산
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 사용자 정보 조회
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(name, code))')
    .eq('id', user.id)
    .single()

  const userInfo = userData as unknown as UserData | null
  if (!userInfo) return null

  const userRole = userInfo.role
  const userDeptIds = userInfo.user_departments?.map(ud => ud.department_id) || []

  // 역할별 결재 대기 상태
  const pendingStatusMap: Record<string, string> = {
    'president': 'submitted',
    'manager': 'coordinator_reviewed',
    'pastor': 'manager_approved'
  }
  const pendingStatus = pendingStatusMap[userRole] || ''

  // 모든 쿼리 병렬 실행
  const [recentResult, thisWeekResult, pendingResult, membersResult, attendanceResult] = await Promise.all([
    supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('weekly_reports')
      .select('id, status')
      .eq('report_date', sundayStr)
      .eq('author_id', user.id)
      .maybeSingle(),
    pendingStatus
      ? supabase
          .from('weekly_reports')
          .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
          .eq('status', pendingStatus)
          .order('report_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    userDeptIds.length > 0
      ? supabase
          .from('members')
          .select('id', { count: 'exact' })
          .in('department_id', userDeptIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [], count: 0 }),
    userDeptIds.length > 0
      ? supabase
          .from('attendance_records')
          .select('member_id, attendance_type')
          .eq('attendance_date', sundayStr)
          .eq('is_present', true)
      : Promise.resolve({ data: [] })
  ])

  // 출석 통계 계산
  let thisWeekStats = { total: 0, worship: 0, meeting: 0 }
  if (userDeptIds.length > 0) {
    const members = (membersResult.data || []) as { id: string }[]
    const memberIds = new Set(members.map(m => m.id))
    const attendance = ((attendanceResult.data || []) as { member_id: string; attendance_type: string }[])
      .filter(a => memberIds.has(a.member_id))

    const totalCount = 'count' in membersResult ? (membersResult.count as number | null) : null

    thisWeekStats = {
      total: totalCount || members.length,
      worship: attendance.filter(a => a.attendance_type === 'worship').length,
      meeting: attendance.filter(a => a.attendance_type === 'meeting').length
    }
  }

  return (
    <DashboardContent
      userInfo={userInfo}
      pendingReports={(pendingResult.data || []) as ReportSummary[]}
      recentReports={(recentResult.data || []) as ReportSummary[]}
      thisWeekReport={thisWeekResult.data as { id: string; status: string } | null}
      thisWeekStats={thisWeekStats}
    />
  )
}
