'use client'

import { useMemo } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useAttendanceMembers, useAttendanceRecordsBrief } from '@/queries/attendance'
import { canAccessAllDepartments } from '@/lib/permissions'
import AttendanceGrid from './AttendanceGrid'

export default function AttendanceClient() {
  const { user } = useAuth()
  const { data: allDepts = [], isLoading: deptsLoading } = useDepartments()

  // 이번 주 일요일
  const sundayStr = useMemo(() => {
    const now = new Date()
    const sunday = new Date(now)
    sunday.setDate(now.getDate() - now.getDay())
    return sunday.toISOString().split('T')[0]
  }, [])

  // 접근 가능한 부서
  const departments = useMemo(() => {
    if (!user) return []
    if (canAccessAllDepartments(user.role)) return allDepts
    return user.user_departments?.map((ud) => ud.departments) || []
  }, [user, allDepts])

  const defaultDeptId = departments[0]?.id

  // TanStack Query로 데이터 조회 (캐시 활용)
  const { data: members = [], isLoading: membersLoading } = useAttendanceMembers(defaultDeptId)
  const { data: allRecords = [], isLoading: recordsLoading } = useAttendanceRecordsBrief(sundayStr)

  // 해당 부서 교인의 출결만 필터
  const attendanceRecords = useMemo(() => {
    const memberIdSet = new Set(members.map(m => m.id))
    return allRecords.filter(a => memberIdSet.has(a.member_id))
  }, [members, allRecords])

  const loading = !user || deptsLoading || membersLoading || recordsLoading

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto">
        <div>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-1" />
        </div>
        <div className="bg-gray-100 rounded-2xl h-96 animate-pulse" />
      </div>
    )
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
