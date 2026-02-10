import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MemberForm from '@/components/members/MemberForm'
import type { UserData } from '@/types/shared'
import { isAdmin as checkAdmin, isTeamLeader as checkTeamLeader, getTeamLeaderDepartments } from '@/lib/permissions'

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ newcomerId?: string }>
}) {
  const supabase = await createClient()
  const { newcomerId } = await searchParams

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

  // 등록 가능한 부서 (code 포함하여 셀 선택에서 활용)
  let departments: { id: string; name: string; code?: string }[] = []
  if (adminUser) {
    const { data } = await supabase.from('departments').select('*')
    departments = data || []
  } else {
    departments = getTeamLeaderDepartments(userInfo)
  }

  // 새신자 데이터 조회 (교인 전환 시)
  let newcomerData: {
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    address: string | null
    affiliation: string | null
    department_id: string | null
  } | null = null

  if (newcomerId) {
    const { data } = await supabase
      .from('newcomers')
      .select('id, name, phone, birth_date, address, affiliation, department_id')
      .eq('id', newcomerId)
      .is('converted_to_member_id', null)
      .single()
    newcomerData = data
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {newcomerData ? '새신자 → 교인 전환' : '교인 등록'}
        </h1>
        <p className="text-gray-500 mt-1">
          {newcomerData
            ? `${newcomerData.name}님의 정보가 자동으로 입력되었습니다.`
            : '새로운 교인 정보를 입력하세요.'}
        </p>
      </div>

      <MemberForm departments={departments} newcomerData={newcomerData} />
    </div>
  )
}
