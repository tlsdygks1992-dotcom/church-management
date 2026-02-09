import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canAccessAllDepartments } from '@/lib/permissions'
import AccountingClient from '@/components/accounting/AccountingClient'
import type { AccountingRecordWithDetails, Department } from '@/types/database'

export default async function AccountingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사용자 정보와 부서 목록을 병렬 조회
  const [userResult, deptResult] = await Promise.all([
    supabase
      .from('users')
      .select('role, user_departments(department_id)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('departments')
      .select('*')
      .order('name'),
  ])

  const userData = userResult.data
  const allDepts = (deptResult.data || []) as Department[]
  const userRole = userData?.role || ''

  // 권한에 따라 부서 필터링
  let departments: Department[]
  if (canAccessAllDepartments(userRole)) {
    departments = allDepts
  } else {
    const userDeptIds = userData?.user_departments?.map(
      (ud: { department_id: string }) => ud.department_id
    ) || []
    departments = allDepts.filter(d => userDeptIds.includes(d.id))
  }

  const initialDeptId = departments[0]?.id || ''
  const canEdit = canAccessAllDepartments(userRole)

  // 현재 월의 회계 기록 조회
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  let initialRecords: AccountingRecordWithDetails[] = []
  if (initialDeptId) {
    const { data } = await supabase
      .from('accounting_records')
      .select(`
        *,
        departments:department_id(name),
        users:created_by(name)
      `)
      .eq('department_id', initialDeptId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: true })
      .order('created_at', { ascending: true })

    initialRecords = (data || []) as AccountingRecordWithDetails[]
  }

  return (
    <AccountingClient
      departments={departments}
      initialDeptId={initialDeptId}
      initialRecords={initialRecords}
      canEdit={canEdit}
      userId={user.id}
    />
  )
}
