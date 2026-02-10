'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Photo {
  id: string
  photo_url: string
  title: string | null
  description: string | null
  photo_date: string | null
  created_at: string
  departments: { name: string } | null
  users: { name: string } | null
}

/** 부서별 사진 조회 */
export function usePhotos(departmentId: string) {
  return useQuery({
    queryKey: ['photos', departmentId],
    queryFn: async (): Promise<Photo[]> => {
      let query = supabase
        .from('department_photos')
        .select('*, departments(name), users:uploaded_by(name)')
        .order('photo_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (departmentId !== 'all') {
        query = query.eq('department_id', departmentId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Photo[]
    },
    staleTime: 60_000,
  })
}
