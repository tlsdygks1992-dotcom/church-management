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
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  // 보고서 조회
  const { data: report } = await supabase
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
    .single()

  if (!report) {
    notFound()
  }

  // 프로그램 목록
  const { data: programs } = await supabase
    .from('report_programs')
    .select('*')
    .eq('report_id', id)
    .order('order_index')

  // 새신자 목록
  const { data: newcomers } = await supabase
    .from('newcomers')
    .select('*')
    .eq('report_id', id)

  // 결재 이력
  const { data: history } = await supabase
    .from('approval_history')
    .select('*, users(name)')
    .eq('report_id', id)
    .order('created_at', { ascending: false })

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
  // 보고 체계: 팀장 → 회장(협조) → 부장(결재) + 목사(협조/확인)

  // 1단계: 회장 협조 (submitted → coordinator_reviewed)
  // 회장이 검토 후 부장에게 전달
  if (report.status === 'submitted' && user.role === 'president') {
    return 'coordinator'
  }

  // 2단계: 부장 결재 (coordinator_reviewed → manager_approved)
  // 부장만 실제 결재 권한 보유
  if (report.status === 'coordinator_reviewed' && user.role === 'manager') {
    return 'manager'
  }

  // 3단계: 목사 확인 (manager_approved → final_approved)
  // 목사는 최종 확인 (협조)
  if (report.status === 'manager_approved' && user.role === 'pastor') {
    return 'final'
  }

  return null
}
