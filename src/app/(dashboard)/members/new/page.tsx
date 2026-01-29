import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MemberForm from '@/components/members/MemberForm'

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

export default async function NewMemberPage() {
  const supabase = await createClient()

  // 현재 사용자 정보
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
    redirect('/members')
  }

  // 등록 가능한 부서
  let departments: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase.from('departments').select('*')
    departments = data || []
  } else {
    departments = userInfo?.user_departments
      ?.filter((ud) => ud.is_team_leader)
      .map((ud) => ud.departments) || []
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">교인 등록</h1>
        <p className="text-gray-500 mt-1">새로운 교인 정보를 입력하세요.</p>
      </div>

      <MemberForm departments={departments} />
    </div>
  )
}
