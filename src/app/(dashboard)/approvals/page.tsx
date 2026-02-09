import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canApprove } from '@/lib/permissions'
import ApprovalsClient from '@/components/approvals/ApprovalsClient'

const ROLE_STATUS_MAP: Record<string, string> = {
  super_admin: 'manager_approved',
  president: 'submitted',
  accountant: 'coordinator_reviewed',
}

// Supabase 쿼리 결과를 Report 타입으로 변환
function transformReports(data: unknown[]) {
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

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사용자 역할 조회
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = userData?.role || ''

  // 결재 권한이 없으면 접근 불가 UI 표시
  if (!canApprove(userRole)) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 text-center">
          <svg className="w-10 h-10 md:w-12 md:h-12 text-yellow-500 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-base md:text-lg font-semibold text-yellow-800 mb-2">접근 권한 없음</h3>
          <p className="text-sm md:text-base text-yellow-600">결재 권한이 있는 사용자만 접근할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  // 결재 대기 + 처리 완료 보고서를 병렬 조회
  const reportSelect = `
    id, title, report_date, status, created_at,
    departments(name, code),
    users!weekly_reports_author_id_fkey(name)
  `

  // 결재 대기 쿼리
  let pendingQuery
  if (userRole === 'super_admin') {
    pendingQuery = supabase
      .from('weekly_reports')
      .select(reportSelect)
      .in('status', ['submitted', 'coordinator_reviewed', 'manager_approved'])
      .order('created_at', { ascending: false })
  } else {
    const pendingStatus = ROLE_STATUS_MAP[userRole]
    pendingQuery = supabase
      .from('weekly_reports')
      .select(reportSelect)
      .eq('status', pendingStatus || 'submitted')
      .order('created_at', { ascending: false })
  }

  // 처리 완료 쿼리
  let completedQuery = supabase
    .from('weekly_reports')
    .select(reportSelect)
    .order('created_at', { ascending: false })
    .limit(20)

  if (userRole === 'super_admin') {
    completedQuery = completedQuery.eq('status', 'final_approved')
  } else if (userRole === 'president') {
    completedQuery = completedQuery.in('status', ['coordinator_reviewed', 'manager_approved', 'final_approved'])
  } else if (userRole === 'accountant') {
    completedQuery = completedQuery.in('status', ['manager_approved', 'final_approved'])
  }

  // 병렬 실행
  const [pendingResult, completedResult] = await Promise.all([
    pendingQuery,
    completedQuery,
  ])

  return (
    <ApprovalsClient
      userRole={userRole}
      pendingReports={transformReports(pendingResult.data || [])}
      completedReports={transformReports(completedResult.data || [])}
    />
  )
}
