import { describe, it, expect } from 'vitest'
import {
  isAdmin,
  isAdminRole,
  canAccessAllDepartments,
  canAccessAccounting,
  canWriteReport,
  canEditMembers,
  canApprove,
  isTeamLeader,
  getAccessibleDepartmentIds,
  getTeamLeaderDepartments,
} from './permissions'
import type { UserData } from '@/types/shared'

// 테스트용 사용자 팩토리
function createUser(overrides: Partial<UserData> = {}): UserData {
  return {
    id: 'test-user',
    name: '테스트 사용자',
    role: 'member',
    is_active: true,
    departments: null,
    user_departments: [],
    ...overrides,
  }
}

describe('isAdmin', () => {
  it('super_admin은 관리자', () => {
    expect(isAdmin('super_admin')).toBe(true)
  })

  it('president는 관리자', () => {
    expect(isAdmin('president')).toBe(true)
  })

  it('team_leader는 관리자 아님', () => {
    expect(isAdmin('team_leader')).toBe(false)
  })

  it('member는 관리자 아님', () => {
    expect(isAdmin('member')).toBe(false)
  })
})

describe('isAdminRole', () => {
  it('accountant도 관리 메뉴 접근 가능', () => {
    expect(isAdminRole('accountant')).toBe(true)
  })
})

describe('canAccessAllDepartments', () => {
  it('super_admin 접근 가능', () => {
    expect(canAccessAllDepartments('super_admin')).toBe(true)
  })

  it('member 접근 불가', () => {
    expect(canAccessAllDepartments('member')).toBe(false)
  })
})

describe('canAccessAccounting', () => {
  it('team_leader 접근 가능', () => {
    expect(canAccessAccounting('team_leader')).toBe(true)
  })

  it('member 접근 불가', () => {
    expect(canAccessAccounting('member')).toBe(false)
  })
})

describe('canWriteReport', () => {
  it('null 사용자는 작성 불가', () => {
    expect(canWriteReport(null)).toBe(false)
  })

  it('super_admin은 작성 가능', () => {
    expect(canWriteReport(createUser({ role: 'super_admin' }))).toBe(true)
  })

  it('팀장 권한이 있으면 작성 가능', () => {
    const user = createUser({
      role: 'member',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(canWriteReport(user)).toBe(true)
  })

  it('일반 회원은 작성 불가', () => {
    expect(canWriteReport(createUser())).toBe(false)
  })
})

describe('canEditMembers', () => {
  it('관리자는 편집 가능', () => {
    expect(canEditMembers(createUser({ role: 'president' }))).toBe(true)
  })

  it('팀장은 편집 가능', () => {
    const user = createUser({
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(canEditMembers(user)).toBe(true)
  })

  it('일반 회원은 편집 불가', () => {
    expect(canEditMembers(createUser())).toBe(false)
  })
})

describe('canApprove', () => {
  it('president는 결재 가능', () => {
    expect(canApprove('president')).toBe(true)
  })

  it('member는 결재 불가', () => {
    expect(canApprove('member')).toBe(false)
  })
})

describe('isTeamLeader', () => {
  it('팀장 여부 올바르게 반환', () => {
    const user = createUser({
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(isTeamLeader(user)).toBe(true)
  })
})

describe('getAccessibleDepartmentIds', () => {
  it('소속 부서 ID 목록 반환', () => {
    const user = createUser({
      user_departments: [
        { department_id: 'dept-1', is_team_leader: false, departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' } },
        { department_id: 'dept-2', is_team_leader: true, departments: { id: 'dept-2', name: 'CU2부', code: 'cu2' } },
      ],
    })
    expect(getAccessibleDepartmentIds(user)).toEqual(['dept-1', 'dept-2'])
  })

  it('null 사용자는 빈 배열', () => {
    expect(getAccessibleDepartmentIds(null)).toEqual([])
  })
})

describe('getTeamLeaderDepartments', () => {
  it('팀장으로 관리하는 부서만 반환', () => {
    const user = createUser({
      user_departments: [
        { department_id: 'dept-1', is_team_leader: false, departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' } },
        { department_id: 'dept-2', is_team_leader: true, departments: { id: 'dept-2', name: 'CU2부', code: 'cu2' } },
      ],
    })
    const result = getTeamLeaderDepartments(user)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('CU2부')
  })
})
