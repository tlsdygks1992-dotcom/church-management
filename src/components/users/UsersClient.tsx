'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useAllUsers } from '@/queries/users'
import { isAdmin } from '@/lib/permissions'
import UserManagement from './UserManagement'

export default function UsersClient() {
  const { user } = useAuth()
  const { data: users = [], isLoading: usersLoading } = useAllUsers()
  const { data: departments = [], isLoading: deptsLoading } = useDepartments()

  if (!user || usersLoading || deptsLoading) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
        <div>
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-1" />
        </div>
        <div className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
      </div>
    )
  }

  // 관리자만 접근 가능
  if (!isAdmin(user.role)) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 lg:p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">접근 권한이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">회원 승인 및 권한 관리</p>
      </div>

      <UserManagement
        users={users}
        departments={departments}
      />
    </div>
  )
}
