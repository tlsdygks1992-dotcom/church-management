// 여러 파일에서 반복 정의되던 인터페이스를 중앙화
// 모든 컴포넌트/페이지에서 이 파일의 타입을 import하여 사용

// ─── 사용자 관련 ─────────────────────────────────────

/** 사용자의 부서 소속 정보 (user_departments 조인 결과) */
export interface UserDepartment {
  department_id: string
  is_team_leader: boolean
  departments: {
    id: string
    name: string
    code: string
  }
}

/** 사용자 정보 (users 테이블 + 조인) */
export interface UserData {
  id: string
  name: string
  role: string
  is_active: boolean
  departments: { name: string } | null
  user_departments: UserDepartment[]
}

/** Header/Sidebar에 전달되는 사용자 정보 */
export type LayoutUser = Pick<UserData, 'id' | 'name' | 'role' | 'departments'> | null

// ─── 교인 관련 ─────────────────────────────────────

/** 교인의 부서 소속 정보 (member_departments 조인 결과) */
export interface MemberDepartmentInfo {
  department_id: string
  is_primary: boolean
  departments: {
    id: string
    name: string
  } | null
}

/** 교인 목록/상세에서 사용하는 교인 데이터 */
export interface MemberWithDepts {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  photo_url: string | null
  department_id: string | null
  is_active: boolean
  joined_at: string
  member_departments: MemberDepartmentInfo[] | null
}

// ─── 보고서 관련 ─────────────────────────────────────

/** 대시보드/목록에서 사용하는 보고서 요약 */
export interface ReportSummary {
  id: string
  report_date: string
  week_number: number
  status: string
  departments: { name: string } | null
  users: { name: string } | null
}

// ─── 부서 관련 ─────────────────────────────────────

/** 부서 선택/필터에서 사용하는 부서 정보 */
export interface DepartmentInfo {
  id: string
  name: string
  code?: string
}
