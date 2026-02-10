import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ReportForm from '@/components/reports/ReportForm'

type ReportType = 'weekly' | 'meeting' | 'education'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 현재 사용자
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(id, name, code))')
    .eq('id', user.id)
    .single()

  // 보고서 조회
  const { data: report } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (!report) {
    notFound()
  }

  // 권한 체크: 작성자이고 draft 또는 rejected 상태일 때만 수정 가능
  if (report.author_id !== user.id || !['draft', 'rejected'].includes(report.status)) {
    redirect(`/reports/${id}`)
  }

  // 프로그램 조회
  const { data: programs } = await supabase
    .from('report_programs')
    .select('*')
    .eq('report_id', id)
    .order('order_index')

  // 새신자 조회
  const { data: newcomers } = await supabase
    .from('newcomers')
    .select('*')
    .eq('report_id', id)

  // 사용자가 접근 가능한 부서
  const isAdmin = userData?.role === 'super_admin' || userData?.role === 'president'
  let departments: { id: string; name: string; code: string }[] = []

  if (isAdmin) {
    const { data } = await supabase.from('departments').select('id, name, code')
    departments = data || []
  } else {
    departments = userData?.user_departments
      ?.filter((ud: { is_team_leader: boolean }) => ud.is_team_leader)
      .map((ud: { departments: { id: string; name: string; code: string } }) => ud.departments) || []
  }

  const reportType = (report.report_type as ReportType) || 'weekly'
  const config = REPORT_TYPE_CONFIG[reportType]

  // 주차 계산
  const reportDate = new Date(report.report_date)
  const startOfYear = new Date(reportDate.getFullYear(), 0, 1)
  const weekNumber = report.week_number || Math.ceil(
    ((reportDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )

  const existingReport = {
    id: report.id,
    department_id: report.department_id,
    report_date: report.report_date,
    week_number: report.week_number,
    notes: report.notes,
    meeting_title: report.meeting_title,
    meeting_location: report.meeting_location,
    attendees: report.attendees,
    main_content: report.main_content,
    application_notes: report.application_notes,
    programs: programs || [],
    newcomers: newcomers || [],
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">{config.label} 수정</h1>
        </div>
        {reportType === 'weekly' && (
          <p className="text-sm text-gray-500 mt-0.5">
            {reportDate.getFullYear()}년 {weekNumber}주차 보고서
          </p>
        )}
      </div>

      <ReportForm
        reportType={reportType}
        departments={departments}
        defaultDate={report.report_date}
        weekNumber={weekNumber}
        authorId={user.id}
        editMode={true}
        existingReport={existingReport}
      />
    </div>
  )
}
