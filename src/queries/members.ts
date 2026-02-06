'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MemberWithDepts } from '@/types/shared'

const supabase = createClient()

const MEMBER_SELECT = 'id, name, phone, birth_date, department_id, is_active, photo_url, joined_at, member_departments(department_id, is_primary, departments(id, name))'

/** 전체 교인 목록 조회 */
export function useMembers(departmentIds?: string[]) {
  return useQuery({
    queryKey: ['members', departmentIds],
    queryFn: async (): Promise<MemberWithDepts[]> => {
      if (departmentIds && departmentIds.length > 0) {
        // 특정 부서 교인만 조회
        const { data: memberDeptData } = await supabase
          .from('member_departments')
          .select('member_id')
          .in('department_id', departmentIds)

        const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]
        if (memberIds.length === 0) return []

        const { data, error } = await supabase
          .from('members')
          .select(MEMBER_SELECT)
          .in('id', memberIds)
          .order('name')
        if (error) throw error
        return (data || []) as unknown as MemberWithDepts[]
      }

      // 전체 교인 조회
      const { data, error } = await supabase
        .from('members')
        .select(MEMBER_SELECT)
        .order('name')
      if (error) throw error
      return (data || []) as unknown as MemberWithDepts[]
    },
  })
}

/** 교인 삭제 mutation */
export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      // 관련 데이터 먼저 삭제
      await supabase.from('member_departments').delete().eq('member_id', memberId)
      const { error } = await supabase.from('members').delete().eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
