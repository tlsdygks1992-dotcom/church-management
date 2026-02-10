'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { canAccessAllDepartments } from '@/lib/permissions'
import AttendanceGrid from './AttendanceGrid'

interface MemberBasic {
  id: string
  name: string
  photo_url: string | null
}

interface AttendanceRecordBasic {
  id: string
  member_id: string
  attendance_type: string
  is_present: boolean
}

export default function AttendanceClient() {
  const { user } = useAuth()
  const { data: allDepts = [], isLoading: deptsLoading } = useDepartments()
  const supabase = useMemo(() => createClient(), [])

  const [initialMembers, setInitialMembers] = useState<MemberBasic[]>([])
  const [initialRecords, setInitialRecords] = useState<AttendanceRecordBasic[]>([])
  const [loading, setLoading] = useState(true)

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

  // 초기 데이터 로드
  useEffect(() => {
    if (!defaultDeptId) {
      setLoading(false)
      return
    }

    async function loadInitial() {
      const [memberDeptResult, attendanceResult] = await Promise.all([
        supabase
          .from('member_departments')
          .select('member_id')
          .eq('department_id', defaultDeptId),
        supabase
          .from('attendance_records')
          .select('id, member_id, attendance_type, is_present')
          .eq('attendance_date', sundayStr),
      ])

      const memberIds = [...new Set((memberDeptResult.data || []).map((md: { member_id: string }) => md.member_id))]

      if (memberIds.length > 0) {
        const { data: membersData } = await supabase
          .from('members')
          .select('id, name, photo_url')
          .in('id', memberIds)
          .eq('is_active', true)
          .order('name')

        const members = (membersData || []) as MemberBasic[]
        const memberIdSet = new Set(members.map(m => m.id))
        const records = ((attendanceResult.data || []) as AttendanceRecordBasic[])
          .filter(a => memberIdSet.has(a.member_id))

        setInitialMembers(members)
        setInitialRecords(records)
      }

      setLoading(false)
    }

    loadInitial()
  }, [defaultDeptId, sundayStr, supabase])

  if (!user || deptsLoading || loading) {
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
          members={initialMembers}
          attendanceRecords={initialRecords}
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
