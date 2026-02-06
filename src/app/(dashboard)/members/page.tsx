import { createClient } from '@/lib/supabase/server'
import MemberList from '@/components/members/MemberList'
import type { UserData, MemberWithDepts } from '@/types/shared'
import { isAdmin as checkAdmin, canEditMembers } from '@/lib/permissions'

export default async function MembersPage() {
  const supabase = await createClient()

  // 현재 사용자 정보와 전체 부서를 병렬로 조회
  const { data: { user } } = await supabase.auth.getUser()

  const [userResult, allDeptsResult] = await Promise.all([
    supabase
      .from('users')
      .select('*, user_departments(department_id, is_team_leader, departments(id, name, code))')
      .eq('id', user!.id)
      .single(),
    supabase.from('departments').select('*')
  ])

  const userInfo = userResult.data as UserData | null
  const adminUser = checkAdmin(userInfo?.role || '')

  // 접근 가능한 부서
  let departments: { id: string; name: string }[] = []
  if (adminUser) {
    departments = allDeptsResult.data || []
  } else {
    departments = userInfo?.user_departments?.map((ud) => ud.departments) || []
  }

  // 교인 목록 (member_departments를 통해 조회)
  let members: MemberWithDepts[] = []
  if (adminUser) {
    const { data } = await supabase
      .from('members')
      .select('id, name, phone, birth_date, department_id, is_active, photo_url, joined_at, member_departments(department_id, is_primary, departments(id, name))')
      .order('name')
    members = (data || []) as unknown as MemberWithDepts[]
  } else {
    const deptIds = departments.map((d) => d.id)
    if (deptIds.length > 0) {
      // member_departments를 통해 해당 부서에 속한 교인 조회
      const { data: memberDeptData } = await supabase
        .from('member_departments')
        .select('member_id')
        .in('department_id', deptIds)

      const memberIds = [...new Set((memberDeptData || []).map(md => md.member_id))]

      if (memberIds.length > 0) {
        const { data } = await supabase
          .from('members')
          .select('id, name, phone, birth_date, department_id, is_active, photo_url, joined_at, member_departments(department_id, is_primary, departments(id, name))')
          .in('id', memberIds)
          .order('name')
        members = (data || []) as unknown as MemberWithDepts[]
      }
    }
  }

  const canEdit = canEditMembers(userInfo)

  return (
    <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">교인 명단</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            총 {members.length}명
          </p>
        </div>
        {canEdit && (
          <a
            href="/members/new"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>등록</span>
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
