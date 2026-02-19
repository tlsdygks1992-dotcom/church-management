import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRecipientsByRole,
  createNotification,
  createNotifications,
  createApprovalNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './notifications'

// ─── Supabase Mock 헬퍼 ──────────────────────────────

/** 체이닝 가능한 Supabase 쿼리 빌더 mock 생성 */
function createMockChain(result: { data?: any; error?: any; count?: number }) {
  const chain: any = {}
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'single', 'order', 'limit']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  // thenable - await 가능하게
  chain.then = (resolve: any) => resolve(result)
  return chain
}

function createMockSupabase(tableResults: Record<string, { data?: any; error?: any; count?: number }> = {}) {
  const chains: Record<string, any> = {}
  return {
    from: vi.fn((table: string) => {
      if (!chains[table]) {
        chains[table] = createMockChain(tableResults[table] || { data: null, error: null })
      }
      return chains[table]
    }),
    _getChain: (table: string) => chains[table],
  } as any
}

// ─── fetch mock (triggerPush용) ──────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

// ─── getRecipientsByRole ──────────────────────────────

describe('getRecipientsByRole', () => {
  it('역할별 사용자 ID 목록 반환', async () => {
    const supabase = createMockSupabase({
      users: { data: [{ id: 'user-1' }, { id: 'user-2' }] },
    })
    const result = await getRecipientsByRole(supabase, 'president')
    expect(result).toEqual(['user-1', 'user-2'])
    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('에러 시 빈 배열 반환', async () => {
    const supabase = createMockSupabase({
      users: { data: null, error: { message: 'DB error' } },
    })
    const result = await getRecipientsByRole(supabase, 'president')
    expect(result).toEqual([])
  })

  it('결과 없으면 빈 배열', async () => {
    const supabase = createMockSupabase({
      users: { data: [] },
    })
    const result = await getRecipientsByRole(supabase, 'super_admin')
    expect(result).toEqual([])
  })
})

// ─── createNotification ──────────────────────────────

describe('createNotification', () => {
  it('알림 생성 성공', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })
    const result = await createNotification(supabase, {
      userId: 'user-1',
      title: '테스트 알림',
      body: '본문입니다',
      link: '/reports/1',
      reportId: 'report-1',
    })
    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('에러 시 false 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'insert failed' } },
    })
    const result = await createNotification(supabase, {
      userId: 'user-1',
      title: '테스트',
      body: '본문',
    })
    expect(result).toBe(false)
  })
})

// ─── createNotifications ──────────────────────────────

describe('createNotifications', () => {
  it('여러 사용자에게 알림 생성', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })
    const result = await createNotifications(supabase, ['user-1', 'user-2'], {
      title: '알림 제목',
      body: '알림 내용',
      link: '/reports/1',
    })
    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('빈 사용자 목록이면 true 반환 (insert 안 함)', async () => {
    const supabase = createMockSupabase()
    const result = await createNotifications(supabase, [], {
      title: '알림',
      body: '내용',
    })
    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('insert 에러 시 false 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'bulk insert failed' } },
    })
    const result = await createNotifications(supabase, ['user-1'], {
      title: '알림',
      body: '내용',
    })
    expect(result).toBe(false)
  })
})

// ─── createApprovalNotification ──────────────────────────

describe('createApprovalNotification', () => {
  it('submitted → president에게 알림', async () => {
    // users 쿼리(getRecipientsByRole) + notifications insert 둘 다 사용
    // 같은 테이블에 다른 결과가 필요한 경우를 위해 개별 mock
    const chain = createMockChain({ data: null, error: null })
    const usersChain = createMockChain({ data: [{ id: 'president-1' }] })
    const supabase = {
      from: vi.fn((table: string) => table === 'users' ? usersChain : chain),
    } as any

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'submitted',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    // users 테이블에서 president 조회
    expect(supabase.from).toHaveBeenCalledWith('users')
    // notifications에 insert
    expect(supabase.from).toHaveBeenCalledWith('notifications')
    // 푸시 트리거 호출
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/push/send'), expect.objectContaining({
      method: 'POST',
    }))
  })

  it('final_approved → author에게 알림', async () => {
    const chain = createMockChain({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) } as any

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'manager_approved',
      toStatus: 'final_approved',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    // author에게 직접 알림이므로 users 테이블 조회 없이 notifications만 insert
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('rejected → author에게 반려 알림', async () => {
    const chain = createMockChain({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue(chain) } as any

    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'submitted',
      toStatus: 'rejected',
      departmentName: 'CU1부',
      reportType: 'meeting',
      authorId: 'author-1',
    })

    expect(result).toBe(true)
    // 푸시 페이로드에 '보고서 반려' 제목 포함
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/push/send'), expect.objectContaining({
      body: expect.stringContaining('보고서 반려'),
    }))
  })

  it('coordinator_reviewed → accountant에게 알림', async () => {
    const usersChain = createMockChain({ data: [{ id: 'acc-1' }] })
    const notiChain = createMockChain({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => table === 'users' ? usersChain : notiChain),
    } as any

    await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'submitted',
      toStatus: 'coordinator_reviewed',
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })

    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('알 수 없는 상태면 true 반환 (no-op)', async () => {
    const supabase = createMockSupabase()
    const result = await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'draft' as any,
      departmentName: '1청년',
      reportType: 'weekly',
      authorId: 'author-1',
    })
    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('메시지에 부서명/보고서 타입 치환', async () => {
    const chain = createMockChain({ data: null, error: null })
    const usersChain = createMockChain({ data: [{ id: 'pres-1' }] })
    const supabase = {
      from: vi.fn((table: string) => table === 'users' ? usersChain : chain),
    } as any

    await createApprovalNotification(supabase, {
      reportId: 'report-1',
      fromStatus: 'draft',
      toStatus: 'submitted',
      departmentName: 'CU워십',
      reportType: 'education',
      authorId: 'author-1',
    })

    // 푸시 본문에 부서명과 보고서 타입 포함
    const fetchCall = (fetch as any).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.body).toContain('CU워십')
    expect(body.body).toContain('교육')
  })
})

// ─── getUnreadCount ──────────────────────────────

describe('getUnreadCount', () => {
  it('읽지 않은 알림 개수 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null, count: 5 },
    })
    const result = await getUnreadCount(supabase, 'user-1')
    expect(result).toBe(5)
  })

  it('에러 시 0 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: { message: 'query failed' }, count: undefined },
    })
    const result = await getUnreadCount(supabase, 'user-1')
    expect(result).toBe(0)
  })
})

// ─── markAsRead ──────────────────────────────

describe('markAsRead', () => {
  it('알림 읽음 처리 성공', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })
    const result = await markAsRead(supabase, ['noti-1', 'noti-2'], 'user-1')
    expect(result).toBe(true)
  })

  it('빈 배열이면 true 반환 (update 안 함)', async () => {
    const supabase = createMockSupabase()
    const result = await markAsRead(supabase, [], 'user-1')
    expect(result).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('에러 시 false 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'update failed' } },
    })
    const result = await markAsRead(supabase, ['noti-1'], 'user-1')
    expect(result).toBe(false)
  })
})

// ─── markAllAsRead ──────────────────────────────

describe('markAllAsRead', () => {
  it('모든 알림 읽음 처리 성공', async () => {
    const supabase = createMockSupabase({
      notifications: { data: null, error: null },
    })
    const result = await markAllAsRead(supabase, 'user-1')
    expect(result).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('에러 시 false 반환', async () => {
    const supabase = createMockSupabase({
      notifications: { error: { message: 'update failed' } },
    })
    const result = await markAllAsRead(supabase, 'user-1')
    expect(result).toBe(false)
  })
})
