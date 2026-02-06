import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReportDetail from '@/components/reports/ReportDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 현재 사용자
  const { data: { user } } = await supabase.auth.getUser()

  // 병렬로 데이터 조회 (성능 최적화)
  const [
    { data: userData },
    { data: report },
    { data: programs },
    { data: newcomers },
    { data: history }
  ] = await Promise.all([
    // 사용자 정보
    supabase
      .from('users')
      .select('*')
      .eq('id', user!.id)
      .single(),
    // 보고서 조회
    supabase
      .from('weekly_reports')
      .select(`
        *,
        departments(name, code),
        users!weekly_reports_author_id_fkey(name),
        coordinator:users!weekly_reports_coordinator_id_fkey(name),
        manager:users!weekly_reports_manager_id_fkey(name),
        final_approver:users!weekly_reports_final_approver_id_fkey(name)
      `)
      .eq('id', id)
      .single(),
    // 프로그램 목록
    supabase
      .from('report_programs')
      .select('*')
      .eq('report_id', id)
      .order('order_index'),
    // 새신자 목록
    supabase
      .from('newcomers')
      .select('*')
      .eq('report_id', id),
    // 결재 이력
    supabase
      .from('approval_history')
      .select('*, users(name)')
      .eq('report_id', id)
      .order('created_at', { ascending: false })
  ])

  // 권한 체크
  const canApprove = checkApprovalPermission(userData, report)

  return (
    <ReportDetail
      report={report}
      programs={programs || []}
      newcomers={newcomers || []}
      history={history || []}
      currentUser={userData}
      canApprove={canApprove}
    />
  )
}

function checkApprovalPermission(user: any, report: any): string | null {
  if (!user) return null

  // 결재 단계별 권한 확인
  // 보고 체계: 팀장 → 회장(협조) → 부장(결재) → 목사(확인)
  // super_admin은 모든 단계 처리 가능

  // 1단계: 회장 협조 (submitted → coordinator_reviewed)
  if (report.status === 'submitted') {
    if (user.role === 'president' || user.role === 'super_admin') {
      return 'coordinator'
    }
  }

  // 2단계: 부장 결재 (coordinator_reviewed → manager_approved)
  if (report.status === 'coordinator_reviewed') {
    if (user.role === 'accountant' || user.role === 'super_admin') {
      return 'manager'
    }
  }

  // 3단계: 목사 확인 (manager_approved → final_approved)
  if (report.status === 'manager_approved') {
    if (user.role === 'super_admin') {
      return 'final'
    }
  }

  return null
}
