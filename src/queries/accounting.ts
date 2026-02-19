'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
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
      const endDate = toLocalDateString(new Date(year, month, 0))

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

/** 이전 잔액 조회 (이월금) */
export function usePreviousBalance(departmentId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['accounting', 'previousBalance', departmentId, year, month],
    queryFn: async (): Promise<number> => {
      const endOfPrevMonth = toLocalDateString(new Date(year, month - 1, 0))

      const { data, error } = await supabase
        .from('accounting_records')
        .select('income_amount, expense_amount')
        .eq('department_id', departmentId)
        .lte('record_date', endOfPrevMonth)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []).reduce((sum: number, r: { income_amount: number; expense_amount: number }) =>
        sum + (r.income_amount || 0) - (r.expense_amount || 0), 0)
    },
    enabled: !!departmentId,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  })
}

/** 지출결의서 목록 조회 */
export function useExpenseRequests(departmentId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['expense-requests', departmentId, year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = toLocalDateString(new Date(year, month, 0))

      const { data, error } = await supabase
        .from('expense_requests')
        .select(`
          *,
          departments:department_id(name),
          users:requester_id(name),
          expense_items(*)
        `)
        .eq('department_id', departmentId)
        .gte('request_date', startDate)
        .lte('request_date', endDate)
        .order('request_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!departmentId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

/** 지출결의서 삭제 mutation */
export function useDeleteExpenseRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // 연결된 회계장부 삭제
      await supabase
        .from('accounting_records')
        .delete()
        .eq('expense_request_id', id)

      // 지출결의서 삭제 (cascade로 항목도 삭제)
      const { error } = await supabase
        .from('expense_requests')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-requests'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
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
