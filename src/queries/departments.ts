'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/types/database'

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
    staleTime: 10 * 60 * 1000, // 부서 데이터는 거의 안 변하므로 10분
  })
}
