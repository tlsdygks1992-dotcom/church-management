import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { AuthProvider } from '@/providers/AuthProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import type { UserData } from '@/types/shared'

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

  // 사용자 정보 조회 (is_active, user_departments 포함)
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      departments(*),
      user_departments(department_id, is_team_leader, departments(id, name, code))
    `)
    .eq('id', user.id)
    .single()

  const userInfo = userData as UserData | null

  // 미승인 사용자는 pending 페이지로 리다이렉트
  if (userInfo && !userInfo.is_active) {
    redirect('/pending')
  }

  return (
    <AuthProvider user={userInfo}>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          {/* 모바일 헤더 */}
          <Header />

          <div className="flex">
            {/* 사이드바 (데스크탑) */}
            <Sidebar />

            {/* 메인 컨텐츠 */}
            <main className="flex-1 lg:ml-64">
              <div className="p-4 lg:p-8 pt-[calc(5rem+env(safe-area-inset-top))] lg:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  )
}
