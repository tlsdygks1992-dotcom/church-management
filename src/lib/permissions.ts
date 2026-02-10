import type { UserData } from '@/types/shared'

// ─── 역할 기반 권한 체크 ──────────────────────────────

/** 최고 관리자 또는 회장인지 확인 */
export function isAdmin(role: string): boolean {
  return role === 'super_admin' || role === 'president'
}

/** 관리자 메뉴 접근 가능한 역할인지 확인 (사이드바/헤더) */
export function isAdminRole(role: string): boolean {
  return ['super_admin', 'president', 'accountant'].includes(role)
}

/** 모든 부서 데이터에 접근 가능한 역할 */
export function canAccessAllDepartments(role: string): boolean {
  return ['super_admin', 'accountant', 'president'].includes(role)
}

/** 회계 기능에 접근 가능한 역할 */
export function canAccessAccounting(role: string): boolean {
  return ['super_admin', 'accountant', 'president', 'team_leader'].includes(role)
}

// ─── 사용자 정보 기반 권한 체크 ─────────────────────────

/** 보고서 작성 권한 (관리자 또는 팀장) */
export function canWriteReport(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.role === 'team_leader' || user.user_departments?.some(ud => ud.is_team_leader)
}

/** 교인 편집 권한 (관리자 또는 팀장) */
export function canEditMembers(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.user_departments?.some(ud => ud.is_team_leader) ?? false
}

/** 교인 삭제 권한 (관리자 또는 팀장) */
export function canDeleteMembers(user: UserData | null): boolean {
  return canEditMembers(user)
}

/** 결재 권한 (회장/부장/최고관리자) */
export function canApprove(role: string): boolean {
  return ['super_admin', 'president', 'accountant'].includes(role)
}

/** 팀장 여부 확인 */
export function isTeamLeader(user: UserData | null): boolean {
  if (!user) return false
  return user.user_departments?.some(ud => ud.is_team_leader) ?? false
}

/** 사용자가 접근 가능한 부서 ID 목록 */
export function getAccessibleDepartmentIds(user: UserData | null): string[] {
  if (!user) return []
  return user.user_departments?.map(ud => ud.department_id) || []
}

/** 팀장으로서 관리하는 부서 목록 */
export function getTeamLeaderDepartments(user: UserData | null): Array<{ id: string; name: string; code: string }> {
  if (!user) return []
  return user.user_departments
    ?.filter(ud => ud.is_team_leader)
    .map(ud => ud.departments) || []
}

// ─── 보고서 열람 권한 ─────────────────────────────────

/**
 * 보고서 열람 권한 체크
 * - 작성자: 항상 가능
 * - 관리자(super_admin, president, accountant): 모든 보고서
 * - 부서 팀장(is_team_leader=true): 해당 부서 전체 보고서
 * - 셀장(is_team_leader=false, role=team_leader): 같은 레벨(셀장) 보고서만
 * - 일반 멤버: 자기 보고서만
 * - 임시저장(draft): 작성자만
 *
 * @param authorIsTeamLeader 보고서 작성자의 is_team_leader 여부 (해당 부서 기준)
 */
export function canViewReport(
  user: UserData | null,
  report: { author_id: string; department_id: string; status?: string },
  authorIsTeamLeader?: boolean
): boolean {
  if (!user) return false

  // 1. 작성자는 항상 열람 가능
  if (user.id === report.author_id) return true

  // 2. 임시저장은 작성자만
  if (report.status === 'draft') return false

  // 3. 관리자 역할은 모든 보고서 열람 가능
  if (canAccessAllDepartments(user.role)) return true

  // 4. 같은 부서 소속 확인
  const userDept = user.user_departments?.find(ud => ud.department_id === report.department_id)
  if (!userDept) return false

  // 5. 부서 팀장 (is_team_leader=true) → 부서 전체 보고서 열람
  if (userDept.is_team_leader) return true

  // 6. 셀장/일반 팀장 (is_team_leader=false, role=team_leader) → 같은 레벨끼리만
  if (user.role === 'team_leader') {
    // 작성자도 is_team_leader=false인 경우만 열람 가능 (셀장끼리)
    return authorIsTeamLeader === false
  }

  // 7. 일반 멤버 → 자기 보고서만 (step 1에서 처리됨)
  return false
}
