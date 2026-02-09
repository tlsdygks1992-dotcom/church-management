'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AccountingRecordWithDetails } from '@/types/database'

const supabase = createClient()

/** 회계장부 월별 조회 (부서 + 년 + 월) */
export function useAccountingRecordsByMonth(
  departmentId: string,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ['accounting', departmentId, year, month],
    queryFn: async (): Promise<AccountingRecordWithDetails[]> => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('accounting_records')
        .select(`
          *,
          departments:department_id(name),
          users:created_by(name)
        `)
        .eq('department_id', departmentId)
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as AccountingRecordWithDetails[]
    },
    enabled: !!departmentId,
    staleTime: 60_000, // 1분간 캐시 유지
  })
}

/** 회계장부 조회 (기존 호환 - 부서 + 년) */
export function useAccountingRecords(departmentId?: string, year?: number) {
  return useQuery({
    queryKey: ['accounting', departmentId, year],
    queryFn: async (): Promise<AccountingRecordWithDetails[]> => {
      let query = supabase
        .from('accounting_records')
        .select('*, departments(name), users:created_by(name)')
        .order('record_date', { ascending: false })

      if (departmentId) {
        query = query.eq('department_id', departmentId)
      }
      if (year) {
        query = query.gte('record_date', `${year}-01-01`).lte('record_date', `${year}-12-31`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as AccountingRecordWithDetails[]
    },
    enabled: !!departmentId,
  })
}

/** 회계 기록 삭제 mutation */
export function useDeleteAccountingRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const { error } = await supabase
        .from('accounting_records')
        .delete()
        .in('id', recordIds)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}
