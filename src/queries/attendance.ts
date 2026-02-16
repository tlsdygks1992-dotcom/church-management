'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceRecord } from '@/types/database'

const supabase = createClient()

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

/** 부서별 교인 목록 (출결용 - 이름/사진만) */
export function useAttendanceMembers(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'members', departmentId],
    queryFn: async (): Promise<MemberBasic[]> => {
      const { data: memberDeptData } = await supabase
        .from('member_departments')
        .select('member_id')
        .eq('department_id', departmentId!)

      const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]
      if (memberIds.length === 0) return []

      const { data, error } = await supabase
        .from('members')
        .select('id, name, photo_url')
        .in('id', memberIds)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data || []) as MemberBasic[]
    },
    enabled: !!departmentId,
    staleTime: 5 * 60_000, // 5분 캐싱
  })
}

/** 특정 날짜의 출결 기록 */
export function useAttendanceRecords(departmentId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', departmentId, date],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', date)
      if (error) throw error
      return data || []
    },
    enabled: !!departmentId && !!date,
    staleTime: 30_000, // 30초 (출결은 자주 변경)
  })
}

/** 특정 날짜의 간단한 출결 기록 (출석한 것만) */
export function useAttendanceRecordsBrief(date: string) {
  return useQuery({
    queryKey: ['attendance', 'brief', date],
    queryFn: async (): Promise<AttendanceRecordBasic[]> => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, member_id, attendance_type, is_present')
        .eq('attendance_date', date)
        .eq('is_present', true)
      if (error) throw error
      return (data || []) as AttendanceRecordBasic[]
    },
    staleTime: 30_000,
  })
}

/** 셀별 교인 목록 (셀장보고서 출석 체크용) */
export function useCellMembers(cellId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'cellMembers', cellId],
    queryFn: async (): Promise<MemberBasic[]> => {
      // cell_id로 member_departments 조회
      const { data: memberDeptData } = await supabase
        .from('member_departments')
        .select('member_id')
        .eq('cell_id', cellId!)

      const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]
      if (memberIds.length === 0) return []

      const { data, error } = await supabase
        .from('members')
        .select('id, name, photo_url')
        .in('id', memberIds)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data || []) as MemberBasic[]
    },
    enabled: !!cellId,
    staleTime: 5 * 60_000,
  })
}

/** 셀원 출결 기록 조회 (특정 날짜, meeting 타입) */
export function useCellAttendanceRecords(memberIds: string[], date: string) {
  return useQuery({
    queryKey: ['attendance', 'cellRecords', memberIds, date],
    queryFn: async (): Promise<{ member_id: string; is_present: boolean }[]> => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('member_id, is_present')
        .in('member_id', memberIds)
        .eq('attendance_date', date)
        .eq('attendance_type', 'meeting')
      if (error) throw error
      return (data || []) as { member_id: string; is_present: boolean }[]
    },
    enabled: memberIds.length > 0 && !!date,
    staleTime: 30_000,
  })
}

/** 출결 체크 mutation */
export function useToggleAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      memberId: string
      date: string
      type: 'worship' | 'meeting'
      isPresent: boolean
      checkedBy: string
    }) => {
      if (params.isPresent) {
        const { error } = await supabase
          .from('attendance_records')
          .upsert({
            member_id: params.memberId,
            attendance_date: params.date,
            attendance_type: params.type,
            is_present: true,
            checked_by: params.checkedBy,
          })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('member_id', params.memberId)
          .eq('attendance_date', params.date)
          .eq('attendance_type', params.type)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}
