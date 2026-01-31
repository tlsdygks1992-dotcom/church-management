'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
  department_id: string | null
  departments: { name: string } | null
}

interface Department {
  id: string
  name: string
  code: string
}

interface UserManagementProps {
  users: User[]
  departments: Department[]
}

interface UserChanges {
  role?: string
  department_id?: string | null
}

const roleLabels: Record<string, string> = {
  super_admin: '관리자',
  president: '회장',
  accountant: '부장',
  team_leader: '팀장',
  member: '일반',
}

const roleOptions = [
  { value: 'member', label: '일반' },
  { value: 'team_leader', label: '팀장' },
  { value: 'president', label: '회장' },
  { value: 'accountant', label: '부장' },
  { value: 'super_admin', label: '관리자' },
]

export default function UserManagement({ users, departments }: UserManagementProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState<string | null>(null)
  const [changes, setChanges] = useState<Record<string, UserChanges>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const filteredUsers = users.filter((user) => {
    // 삭제된 사용자 제외
    if (deletedIds.has(user.id)) return false
    if (filter === 'pending') return !user.is_active
    if (filter === 'approved') return user.is_active
    return true
  })

  const pendingCount = users.filter((u) => !u.is_active && !deletedIds.has(u.id)).length
  const totalCount = users.filter((u) => !deletedIds.has(u.id)).length

  const handleApprove = async (userId: string) => {
    setSaving(userId)
    try {
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)

      startTransition(() => {
        router.refresh()
      })
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`"${userName}" 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return

    setSaving(userId)
    setMessage(null)

    try {
      // users 테이블에서 삭제 (auth.users는 Supabase 대시보드에서 별도 삭제 필요)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Delete error:', error)
        setMessage({ type: 'error', text: `삭제 실패: ${error.message}` })
        setSaving(null)
        return
      }

      // UI에서 즉시 제거 (Optimistic update)
      setDeletedIds((prev) => new Set([...prev, userId]))
      setMessage({ type: 'success', text: '사용자가 삭제되었습니다.' })

      startTransition(() => {
        router.refresh()
      })
    } catch (error: unknown) {
      console.error('Delete error:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      setMessage({ type: 'error', text: `삭제 실패: ${errorMessage}` })
    } finally {
      setSaving(null)
    }
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    setChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], role: newRole },
    }))
    setMessage(null)
  }

  const handleDepartmentChange = (userId: string, deptId: string | null) => {
    setChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], department_id: deptId },
    }))
    setMessage(null)
  }

  const handleSave = async (userId: string) => {
    const userChanges = changes[userId]
    if (!userChanges) return

    setSaving(userId)
    setMessage(null)

    try {
      const updateData: { role?: string; department_id?: string | null } = {}
      if (userChanges.role !== undefined) updateData.role = userChanges.role
      if (userChanges.department_id !== undefined) updateData.department_id = userChanges.department_id

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('Supabase error:', error)
        setMessage({ type: 'error', text: `저장 실패: ${error.message}` })
        setSaving(null)
        return
      }

      // user_departments 테이블도 업데이트
      if (userChanges.department_id) {
        await supabase
          .from('user_departments')
          .upsert({ user_id: userId, department_id: userChanges.department_id, is_team_leader: false })
      }

      // 변경사항 초기화
      setChanges((prev) => {
        const newChanges = { ...prev }
        delete newChanges[userId]
        return newChanges
      })

      setMessage({ type: 'success', text: '저장되었습니다.' })

      startTransition(() => {
        router.refresh()
      })
    } catch (error: unknown) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      setMessage({ type: 'error', text: `저장 실패: ${errorMessage}` })
    } finally {
      setSaving(null)
    }
  }

  const hasChanges = (userId: string) => {
    return !!changes[userId]
  }

  const getDisplayValue = (user: User, field: 'role' | 'department_id') => {
    const userChanges = changes[user.id]
    if (userChanges && userChanges[field] !== undefined) {
      return userChanges[field]
    }
    return user[field]
  }

  return (
    <div className="space-y-4">
      {/* 메시지 표시 */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체 ({totalCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          승인 대기 ({pendingCount})
          {pendingCount > 0 && filter !== 'pending' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          승인됨
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 ${!user.is_active ? 'bg-yellow-50/50' : ''} ${
                  saving === user.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  {/* 사용자 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          대기중
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')} 가입
                    </p>
                  </div>

                  {/* 컨트롤 */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 부서 선택 */}
                    <select
                      value={getDisplayValue(user, 'department_id') || ''}
                      onChange={(e) => handleDepartmentChange(user.id, e.target.value || null)}
                      disabled={saving === user.id}
                      className={`px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                        changes[user.id]?.department_id !== undefined
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <option value="">부서 없음</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>

                    {/* 역할 선택 */}
                    <select
                      value={getDisplayValue(user, 'role') as string}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={saving === user.id}
                      className={`px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                        changes[user.id]?.role !== undefined
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* 저장 버튼 (변경사항 있을 때) */}
                    {hasChanges(user.id) && (
                      <button
                        onClick={() => handleSave(user.id)}
                        disabled={saving === user.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
                      >
                        {saving === user.id ? '저장 중...' : '저장'}
                      </button>
                    )}

                    {/* 승인 버튼 (미승인 사용자만) */}
                    {!user.is_active && (
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={saving === user.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                      >
                        승인
                      </button>
                    )}

                    {/* 삭제 버튼 (모든 사용자) */}
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      disabled={saving === user.id}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 active:bg-red-300 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-500 text-sm">
              {filter === 'pending' ? '승인 대기 중인 사용자가 없습니다' : '사용자가 없습니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
