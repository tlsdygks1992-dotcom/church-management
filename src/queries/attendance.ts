'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceRecord } from '@/types/database'

const supabase = createClient()

/** 출결 기록 조회 */
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
