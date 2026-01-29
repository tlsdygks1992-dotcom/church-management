import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportForm from '@/components/reports/ReportForm'

interface UserDepartment {
  department_id: string
  is_team_leader: boolean
  departments: {
    id: string
    name: string
  }
}

interface UserData {
  role: string
  user_departments: UserDepartment[]
}

export default async function NewReportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(id, name))')
    .eq('id', user!.id)
    .single()

  const userInfo = userData as UserData | null
  const isAdmin = userInfo?.role === 'super_admin' || userInfo?.role === 'president'
  const isTeamLeader = userInfo?.user_departments?.some((ud) => ud.is_team_leader)

  if (!isAdmin && !isTeamLeader) {
    redirect('/reports')
  }

  // 작성 가능한 부서
  let departments: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase.from('departments').select('*')
    departments = data || []
  } else {
    departments = userInfo?.user_departments
      ?.filter((ud) => ud.is_team_leader)
      .map((ud) => ud.departments) || []
  }

  // 이번 주 일요일
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 주차 계산
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">주차 보고서 작성</h1>
        <p className="text-gray-500 mt-1">
          {now.getFullYear()}년 {weekNumber}주차 보고서
        </p>
      </div>

      <ReportForm
        departments={departments}
        defaultDate={sundayStr}
        weekNumber={weekNumber}
        authorId={user!.id}
      />
    </div>
  )
}
