import { createClient } from '@/lib/supabase/server'
import AttendanceGrid from '@/components/attendance/AttendanceGrid'

interface Department {
  id: string
  name: string
  code: string
}

export default async function AttendancePage() {
  const supabase = await createClient()

  // 이번 주 일요일 날짜
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 1단계: 사용자 정보와 전체 부서를 병렬로 조회
  const { data: { user } } = await supabase.auth.getUser()

  const [userResult, allDeptsResult] = await Promise.all([
    supabase
      .from('users')
      .select('*, departments(id, name, code)')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
      .order('name')
  ])

  const userData = userResult.data

  // super_admin은 모든 부서 접근 가능, 아니면 자신의 부서만
  let departments: Department[] = []

  if (userData?.role === 'super_admin' || userData?.role === 'president' || userData?.role === 'accountant') {
    departments = (allDeptsResult.data || []) as Department[]
  } else if (userData?.departments) {
    departments = [userData.departments as Department]
  }

  // 기본 부서 (첫 번째 부서)
  const defaultDeptId = departments[0]?.id

  // 2단계: 교인 목록과 출결 기록을 병렬로 조회
  let members: Array<{ id: string; name: string; phone: string | null; photo_url: string | null; is_active: boolean }> = []
  let attendanceRecords: Array<{ id: string; member_id: string; attendance_type: string; is_present: boolean; attendance_date: string }> = []

  if (defaultDeptId) {
    // member_departments와 출결 기록을 병렬로 조회
    const [memberDeptResult, attendanceResult] = await Promise.all([
      supabase
        .from('member_departments')
        .select('member_id')
        .eq('department_id', defaultDeptId),
      supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', sundayStr)
    ])

    const memberIds = [...new Set((memberDeptResult.data || []).map(md => md.member_id))]

    if (memberIds.length > 0) {
      const { data } = await supabase
        .from('members')
        .select('id, name, phone, photo_url, is_active')
        .in('id', memberIds)
        .eq('is_active', true)
        .order('name')
      members = (data || []) as typeof members

      // 해당 부서 교인의 출결만 필터링
      const memberIdSet = new Set(members.map(m => m.id))
      attendanceRecords = ((attendanceResult.data || []) as typeof attendanceRecords)
        .filter(a => memberIdSet.has(a.member_id))
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">출결 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(sundayStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </div>

      {departments.length > 0 ? (
        <AttendanceGrid
          departments={departments}
          defaultDepartmentId={defaultDeptId}
          members={members}
          attendanceRecords={attendanceRecords}
          attendanceDate={sundayStr}
        />
      ) : (
        <div className="bg-white rounded-2xl p-6 lg:p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">접근 가능한 부서가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
