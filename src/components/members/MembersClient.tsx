'use client'

import { useMemo } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useMembers } from '@/queries/members'
import { isAdmin as checkAdmin, canEditMembers, canAccessAllDepartments, getAccessibleDepartmentIds } from '@/lib/permissions'
import MemberList from './MemberList'

export default function MembersClient() {
  const { user } = useAuth()
  const { data: allDepts = [], isLoading: deptsLoading } = useDepartments()

  const adminUser = checkAdmin(user?.role || '')
  const isAllAccess = canAccessAllDepartments(user?.role || '')

  // 접근 가능한 부서
  const departments = useMemo(() => {
    if (isAllAccess) return allDepts
    return user?.user_departments?.map((ud) => ud.departments) || []
  }, [isAllAccess, allDepts, user])

  // useMembers에 전달할 부서 ID (관리자는 undefined → 전체, 비관리자는 소속 부서)
  const departmentIds = useMemo(() => {
    if (isAllAccess) return undefined
    return getAccessibleDepartmentIds(user)
  }, [isAllAccess, user])

  const { data: members = [], isLoading: membersLoading } = useMembers(departmentIds)

  const canEdit = canEditMembers(user)

  if (!user || deptsLoading || membersLoading) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 lg:gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />)}
        </div>
      </div>
    )
  }

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
          <div className="flex items-center gap-2">
            <a
              href="/members/bulk-photos"
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">사진 일괄</span>
            </a>
            <a
              href="/members/new"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>등록</span>
            </a>
          </div>
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
