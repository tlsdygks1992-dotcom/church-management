import { createClient } from '@/lib/supabase/server'
import MemberList from '@/components/members/MemberList'

interface UserDepartment {
  department_id: string
  is_team_leader: boolean
  departments: {
    id: string
    name: string
    code: string
  }
}

interface UserData {
  role: string
  user_departments: UserDepartment[]
}

export default async function MembersPage() {
  const supabase = await createClient()

  // 현재 사용자 정보
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(id, name, code))')
    .eq('id', user!.id)
    .single()

  const userInfo = userData as UserData | null
  const isAdmin = userInfo?.role === 'super_admin' || userInfo?.role === 'president'

  // 접근 가능한 부서
  let departments: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase.from('departments').select('*')
    departments = data || []
  } else {
    departments = userInfo?.user_departments?.map((ud) => ud.departments) || []
  }

  // 교인 목록
  let members: Array<{ id: string; name: string; phone: string | null; department_id: string; is_active: boolean; photo_url: string | null; joined_at: string; departments: { name: string } | null }> = []
  if (isAdmin) {
    const { data } = await supabase
      .from('members')
      .select('*, departments(name)')
      .order('name')
    members = (data || []) as typeof members
  } else {
    const deptIds = departments.map((d) => d.id)
    if (deptIds.length > 0) {
      const { data } = await supabase
        .from('members')
        .select('*, departments(name)')
        .in('department_id', deptIds)
        .order('name')
      members = (data || []) as typeof members
    }
  }

  const canEdit = isAdmin || userInfo?.user_departments?.some((ud) => ud.is_team_leader)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">교인 명단</h1>
          <p className="text-gray-500 mt-1">
            총 {members.length}명의 교인
          </p>
        </div>
        {canEdit && (
          <a
            href="/members/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            교인 등록
          </a>
        )}
      </div>

      <MemberList
        members={members}
        departments={departments}
        canEdit={canEdit || false}
      />
    </div>
  )
}
