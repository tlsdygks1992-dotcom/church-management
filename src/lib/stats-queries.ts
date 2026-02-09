// 출결 통계 계산 로직 (서버/클라이언트 공용)
// Supabase 클라이언트를 인자로 받아 양쪽에서 사용 가능

interface Department {
  id: string
  name: string
  code: string
}

export interface DepartmentStats {
  department: string
  code: string
  totalMembers: number
  worshipCount: number
  meetingCount: number
  worshipRate: number
  meetingRate: number
}

export interface WeeklyStats {
  week: string
  worship: number
  meeting: number
  total: number
}

type Period = 'month' | 'quarter' | 'year'

/** 기간 시작일 계산 */
export function getStartDate(period: Period): string {
  const now = new Date()
  let startDate: Date

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    startDate = new Date(now.getFullYear(), quarter * 3, 1)
  } else {
    startDate = new Date(now.getFullYear(), 0, 1)
  }

  return startDate.toISOString().split('T')[0]
}

/** 주 시작일 계산 (일요일 기준) */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

/** 주 포맷 (M/D 형식) */
function formatWeek(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** 부서별 출결 통계 계산 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeDepartmentStats(
  supabase: any,
  departments: Department[],
  startDate: string,
  period: Period,
): Promise<DepartmentStats[]> {
  // member_departments를 통해 부서별 멤버 조회
  const { data: memberDepts } = await supabase
    .from('member_departments')
    .select('member_id, department_id, members!inner(id, is_active)')
    .eq('members.is_active', true)

  const activeMemberDepts = (memberDepts || []).filter(
    (md: { members?: { is_active: boolean } }) => md.members?.is_active
  )

  // 출결 기록 조회
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('member_id, attendance_type, is_present, attendance_date')
    .gte('attendance_date', startDate)
    .eq('is_present', true)

  // 멤버ID -> 부서ID 매핑
  const memberToDepts = new Map<string, Set<string>>()
  activeMemberDepts.forEach((md: { member_id: string; department_id: string }) => {
    if (!memberToDepts.has(md.member_id)) {
      memberToDepts.set(md.member_id, new Set())
    }
    memberToDepts.get(md.member_id)!.add(md.department_id)
  })

  // 부서별 멤버 수
  const deptMemberCounts = new Map<string, number>()
  activeMemberDepts.forEach((md: { department_id: string }) => {
    deptMemberCounts.set(md.department_id, (deptMemberCounts.get(md.department_id) || 0) + 1)
  })

  // 부서별 집계
  const deptMap = new Map<string, { worship: number; meeting: number; total: number }>()
  departments.forEach(dept => {
    deptMap.set(dept.id, { worship: 0, meeting: 0, total: deptMemberCounts.get(dept.id) || 0 })
  })

  // 출결 기록을 부서별로 집계
  ;(attendance || []).forEach((record: { member_id: string; attendance_type: string }) => {
    const deptIds = memberToDepts.get(record.member_id)
    if (deptIds) {
      deptIds.forEach(deptId => {
        if (deptMap.has(deptId)) {
          const stats = deptMap.get(deptId)!
          if (record.attendance_type === 'worship') stats.worship++
          else if (record.attendance_type === 'meeting') stats.meeting++
        }
      })
    }
  })

  const weeks = period === 'month' ? 4 : period === 'quarter' ? 13 : 52

  return departments.map(dept => {
    const data = deptMap.get(dept.id) || { worship: 0, meeting: 0, total: 0 }
    const expectedAttendance = data.total * weeks
    return {
      department: dept.name,
      code: dept.code,
      totalMembers: data.total,
      worshipCount: data.worship,
      meetingCount: data.meeting,
      worshipRate: expectedAttendance > 0 ? Math.round((data.worship / expectedAttendance) * 100) : 0,
      meetingRate: expectedAttendance > 0 ? Math.round((data.meeting / expectedAttendance) * 100) : 0,
    }
  })
}

/** 주간 출석 추이 계산 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeWeeklyTrend(
  supabase: any,
  selectedDept: string,
  selectedCell: string,
  startDate: string,
): Promise<WeeklyStats[]> {
  let memberIds: string[] = []

  if (selectedDept !== 'all') {
    let query = supabase
      .from('member_departments')
      .select('member_id')
      .eq('department_id', selectedDept)

    if (selectedCell !== 'all') {
      query = query.eq('cell_id', selectedCell)
    }

    const { data: memberDepts } = await query
    const ids = (memberDepts || []).map((md: { member_id: string }) => md.member_id)
    memberIds = [...new Set(ids)] as string[]
  }

  let query = supabase
    .from('attendance_records')
    .select('attendance_date, attendance_type, is_present, member_id')
    .gte('attendance_date', startDate)
    .eq('is_present', true)

  if (selectedDept !== 'all' && memberIds.length > 0) {
    query = query.in('member_id', memberIds)
  }

  const { data: attendance } = await query

  // 주별 그룹핑
  const weekMap = new Map<string, { worship: number; meeting: number }>()
  ;(attendance || []).forEach((record: { attendance_date: string; attendance_type: string }) => {
    const date = new Date(record.attendance_date)
    const weekStart = getWeekStart(date)
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { worship: 0, meeting: 0 })
    }

    const stats = weekMap.get(weekKey)!
    if (record.attendance_type === 'worship') stats.worship++
    else if (record.attendance_type === 'meeting') stats.meeting++
  })

  // 재적 인원 조회
  let total = 0
  if (selectedDept === 'all') {
    const { count } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    total = count || 0
  } else {
    let totalQuery = supabase
      .from('member_departments')
      .select('member_id, members!inner(is_active)')
      .eq('department_id', selectedDept)
      .eq('members.is_active', true)

    if (selectedCell !== 'all') {
      totalQuery = totalQuery.eq('cell_id', selectedCell)
    }

    const { data: deptMembers } = await totalQuery
    total = deptMembers?.length || 0
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, data]) => ({
      week: formatWeek(week),
      worship: data.worship,
      meeting: data.meeting,
      total,
    }))
}
