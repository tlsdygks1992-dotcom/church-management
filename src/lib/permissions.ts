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
