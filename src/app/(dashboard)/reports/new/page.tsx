'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ReportForm from '@/components/reports/ReportForm'

type ReportType = 'weekly' | 'meeting' | 'education'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
}

interface Department {
  id: string
  name: string
  code: string
}

export default function NewReportPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const reportType = (searchParams.get('type') as ReportType) || 'weekly'

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [canWrite, setCanWrite] = useState(false)

  // 이번 주 일요일
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 주차 계산
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const { data: userData } = await supabase
      .from('users')
      .select('*, user_departments(department_id, is_team_leader, departments(id, name, code))')
      .eq('id', user.id)
      .single()

    // 팀장 이상 권한 체크: super_admin, president, accountant, team_leader
    const adminRoles = ['super_admin', 'president', 'accountant', 'team_leader']
    const isAdmin = adminRoles.includes(userData?.role)
    const isTeamLeader = userData?.user_departments?.some((ud: { is_team_leader: boolean }) => ud.is_team_leader)

    if (!isAdmin && !isTeamLeader) {
      setCanWrite(false)
      setLoading(false)
      return
    }

    setCanWrite(true)

    // 작성 가능한 부서
    if (isAdmin) {
      const { data } = await supabase.from('departments').select('id, name, code')
      setDepartments(data || [])
    } else {
      const depts = userData?.user_departments
        ?.filter((ud: { is_team_leader: boolean }) => ud.is_team_leader)
        .map((ud: { departments: Department }) => ud.departments) || []
      setDepartments(depts)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!canWrite) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">보고서 작성 권한이 없습니다.</p>
      </div>
    )
  }

  const config = REPORT_TYPE_CONFIG[reportType]

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">{config.label} 작성</h1>
        </div>
        {reportType === 'weekly' && (
          <p className="text-sm text-gray-500 mt-0.5">
            {now.getFullYear()}년 {weekNumber}주차 보고서
          </p>
        )}
      </div>

      <ReportForm
        reportType={reportType}
        departments={departments}
        defaultDate={sundayStr}
        weekNumber={weekNumber}
        authorId={userId!}
      />
    </div>
  )
}
