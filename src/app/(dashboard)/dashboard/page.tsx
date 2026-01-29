import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface UserDepartment {
  department_id: string
  is_team_leader: boolean
  departments: { name: string; code: string }
}

interface UserData {
  name: string
  role: string
  user_departments: UserDepartment[]
}

interface ReportItem {
  id: string
  report_date: string
  week_number: number
  status: string
  departments: { name: string } | null
  users: { name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 현재 사용자 정보
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(name, code))')
    .eq('id', user!.id)
    .single()

  const userInfo = userData as unknown as UserData | null
  const userRole = userInfo?.role || ''

  // 이번 주 일요일 계산
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 역할에 따른 결재 대기 건수
  let pendingReports: ReportItem[] = []
  let pendingStatus = ''

  if (userRole === 'president') {
    // 회장: submitted 상태 보고서 대기
    pendingStatus = 'submitted'
    const { data } = await supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .eq('status', 'submitted')
      .order('report_date', { ascending: false })
    pendingReports = (data || []) as ReportItem[]
  } else if (userRole === 'manager') {
    // 부장: coordinator_reviewed 상태 보고서 대기
    pendingStatus = 'coordinator_reviewed'
    const { data } = await supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .eq('status', 'coordinator_reviewed')
      .order('report_date', { ascending: false })
    pendingReports = (data || []) as ReportItem[]
  } else if (userRole === 'pastor') {
    // 목사: manager_approved 상태 보고서 대기
    pendingStatus = 'manager_approved'
    const { data } = await supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .eq('status', 'manager_approved')
      .order('report_date', { ascending: false })
    pendingReports = (data || []) as ReportItem[]
  }

  // 이번 주 출석 통계 (사용자 부서 기준)
  const userDeptIds = userInfo?.user_departments?.map(ud => ud.department_id) || []

  let thisWeekStats = { total: 0, worship: 0, meeting: 0 }
  if (userDeptIds.length > 0) {
    // 부서별 재적 인원
    const { count: totalCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .in('department_id', userDeptIds)
      .eq('is_active', true)

    // 이번 주 출석 기록
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .in('department_id', userDeptIds)
      .eq('is_active', true)

    if (members && members.length > 0) {
      const memberIds = members.map(m => m.id)

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', sundayStr)
        .in('member_id', memberIds)
        .eq('is_present', true)

      const worshipCount = attendance?.filter(a => a.attendance_type === 'worship').length || 0
      const meetingCount = attendance?.filter(a => a.attendance_type === 'meeting').length || 0

      thisWeekStats = {
        total: totalCount || 0,
        worship: worshipCount,
        meeting: meetingCount
      }
    } else {
      thisWeekStats.total = totalCount || 0
    }
  }

  // 최근 보고서 (내가 작성했거나 내 부서의 보고서)
  const { data: recentReportsData } = await supabase
    .from('weekly_reports')
    .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(5)
  const recentReports = (recentReportsData || []) as ReportItem[]

  // 이번 주 보고서 작성 여부
  const { data: thisWeekReport } = await supabase
    .from('weekly_reports')
    .select('id, status')
    .eq('report_date', sundayStr)
    .eq('author_id', user!.id)
    .single()

  const isTeamLeader = userInfo?.user_departments?.some((ud) => ud.is_team_leader)
  const userDeptName = userInfo?.user_departments?.[0]?.departments?.name || ''

  // 역할 표시명
  const roleDisplayNames: Record<string, string> = {
    'president': '회장',
    'manager': '부장',
    'pastor': '담당목사',
    'team_leader': '팀장',
    'member': '교인',
    'super_admin': '관리자'
  }

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              안녕하세요, {userInfo?.name}님
            </h1>
            <p className="text-blue-100">
              {roleDisplayNames[userRole] || userRole}
              {userDeptName && ` · ${userDeptName}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">
              {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-white font-medium">
              {today.toLocaleDateString('ko-KR', { weekday: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* 이번 주 현황 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">재적 인원</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{thisWeekStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">이번 주 예배</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{thisWeekStats.worship}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            출석률 {thisWeekStats.total > 0 ? Math.round((thisWeekStats.worship / thisWeekStats.total) * 100) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">이번 주 모임</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{thisWeekStats.meeting}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            출석률 {thisWeekStats.total > 0 ? Math.round((thisWeekStats.meeting / thisWeekStats.total) * 100) : 0}%
          </p>
        </div>

        {pendingReports.length > 0 ? (
          <Link
            href="/approvals"
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative"
          >
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingReports.length}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {userRole === 'president' ? '협조 대기' : userRole === 'manager' ? '결재 대기' : '확인 대기'}
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{pendingReports.length}건</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">결재 현황</p>
                <p className="text-lg font-medium text-gray-400 mt-1">대기 없음</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/attendance"
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">출결 관리</h3>
          <p className="text-sm text-gray-500 mt-0.5">출석 체크</p>
        </Link>

        {isTeamLeader && (
          <Link
            href="/reports/new"
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative"
          >
            {!thisWeekReport && (
              <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">보고서 작성</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {thisWeekReport ? (
                <span className="text-green-600">이번 주 작성됨</span>
              ) : (
                <span className="text-red-500">이번 주 미작성</span>
              )}
            </p>
          </Link>
        )}

        <Link
          href="/reports"
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">보고서 목록</h3>
          <p className="text-sm text-gray-500 mt-0.5">전체 보기</p>
        </Link>

        <Link
          href="/members"
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">교인 명단</h3>
          <p className="text-sm text-gray-500 mt-0.5">명단 관리</p>
        </Link>
      </div>

      {/* 결재 대기 목록 (관리자용) */}
      {pendingReports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {userRole === 'president' ? '협조 대기 보고서' : userRole === 'manager' ? '결재 대기 보고서' : '확인 대기 보고서'}
            </h2>
            <Link href="/approvals" className="text-sm text-blue-600 hover:text-blue-700">
              전체 보기 →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingReports.slice(0, 3).map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {report.departments?.name} - 제{report.week_number}주
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(report.report_date).toLocaleDateString('ko-KR')} · {report.users?.name}
                  </p>
                </div>
                <span className="text-blue-600 text-sm font-medium">검토하기 →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 최근 보고서 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">최근 보고서</h2>
          <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-700">
            전체 보기 →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {report.departments?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(report.report_date).toLocaleDateString('ko-KR')} · {report.users?.name}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </Link>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-gray-500">
              아직 작성된 보고서가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: '작성 중', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: '제출됨', className: 'bg-yellow-100 text-yellow-700' },
    coordinator_reviewed: { label: '회장 협조', className: 'bg-blue-100 text-blue-700' },
    manager_approved: { label: '부장 결재', className: 'bg-purple-100 text-purple-700' },
    final_approved: { label: '완료', className: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', className: 'bg-red-100 text-red-700' },
  }

  const { label, className } = config[status] || config.draft

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
