import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MemberForm from '@/components/members/MemberForm'
import type { UserData } from '@/types/shared'
import { isAdmin as checkAdmin, isTeamLeader as checkTeamLeader, getTeamLeaderDepartments } from '@/lib/permissions'

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
  const adminUser = checkAdmin(userInfo?.role || '')
  const teamLeader = checkTeamLeader(userInfo)

  if (!adminUser && !teamLeader) {
    redirect('/members')
  }

  // 등록 가능한 부서
  let departments: { id: string; name: string }[] = []
  if (adminUser) {
    const { data } = await supabase.from('departments').select('*')
    departments = data || []
  } else {
    departments = getTeamLeaderDepartments(userInfo)
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
