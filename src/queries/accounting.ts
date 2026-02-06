'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AccountingRecordWithDetails } from '@/types/database'

const supabase = createClient()

/** 회계장부 조회 */
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
