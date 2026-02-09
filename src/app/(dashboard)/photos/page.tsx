import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PhotosClient from '@/components/photos/PhotosClient'

export default async function PhotosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사용자 정보, 부서 목록, 사진을 병렬 조회
  const [userResult, deptResult, photosResult] = await Promise.all([
    supabase
      .from('users')
      .select('role, department_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
      .order('name'),
    supabase
      .from('department_photos')
      .select('*, departments(name), users:uploaded_by(name)')
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const userData = userResult.data
  const departments = deptResult.data || []
  const initialPhotos = photosResult.data || []

  const adminRoles = ['super_admin', 'president', 'accountant', 'team_leader']
  const canUpload = adminRoles.includes(userData?.role || '')

  return (
    <PhotosClient
      departments={departments as { id: string; name: string; code: string }[]}
      initialPhotos={initialPhotos as any[]}
      canUpload={canUpload}
      userId={user.id}
      userDeptId={userData?.department_id || null}
    />
  )
}
