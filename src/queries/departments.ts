'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Department, Cell } from '@/types/database'

const supabase = createClient()

/** 전체 부서 목록 조회 */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60_000, // 부서 데이터는 거의 안 변하므로 10분
    placeholderData: keepPreviousData,
  })
}

/** 특정 부서의 셀 목록 조회 */
export function useCells(departmentId?: string) {
  return useQuery({
    queryKey: ['cells', departmentId],
    queryFn: async (): Promise<Cell[]> => {
      if (!departmentId) return []
      const { data, error } = await supabase
        .from('cells')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return data || []
    },
    enabled: !!departmentId,
    staleTime: 10 * 60 * 1000,
  })
}

/** 관리자용: 부서의 모든 셀 조회 (비활성 포함) */
export function useAllCells(departmentId?: string) {
  return useQuery({
    queryKey: ['cells', 'all', departmentId],
    queryFn: async (): Promise<Cell[]> => {
      if (!departmentId) return []
      const { data, error } = await supabase
        .from('cells')
        .select('*')
        .eq('department_id', departmentId)
        .order('display_order')
      if (error) throw error
      return data || []
    },
    enabled: !!departmentId,
  })
}

/** 셀 추가 */
export function useCreateCell() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { department_id: string; name: string; display_order: number }) => {
      const { data, error } = await supabase
        .from('cells')
        .insert(params)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cells'] })
    },
  })
}

/** 셀 수정 */
export function useUpdateCell() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; display_order?: number; is_active?: boolean }) => {
      const { id, ...updates } = params
      const { error } = await supabase
        .from('cells')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cells'] })
    },
  })
}

/** 셀 순서 일괄 업데이트 */
export function useReorderCells() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cells: { id: string; display_order: number }[]) => {
      const updates = cells.map(c =>
        supabase.from('cells').update({ display_order: c.display_order, updated_at: new Date().toISOString() }).eq('id', c.id)
      )
      await Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cells'] })
    },
  })
}
