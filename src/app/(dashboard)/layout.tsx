import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

interface UserData {
  id: string
  name: string
  role: string
  departments: { name: string } | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자 정보 조회
  const { data: userData } = await supabase
    .from('users')
    .select('*, departments(*)')
    .eq('id', user.id)
    .single()

  const userInfo = userData as UserData | null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <Header user={userInfo} />

      <div className="flex">
        {/* 사이드바 (데스크탑) */}
        <Sidebar user={userInfo} />

        {/* 메인 컨텐츠 */}
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8 pt-20 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
