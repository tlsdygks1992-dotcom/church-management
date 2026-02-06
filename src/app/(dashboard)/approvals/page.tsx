'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Report {
  id: string
  title: string
  report_date: string
  status: string
  created_at: string
  departments: { name: string; code: string } | null
  users: { name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  submitted: {
    label: '협조 대기',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  coordinator_reviewed: {
    label: '결재 대기',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  manager_approved: {
    label: '확인 대기',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  final_approved: {
    label: '완료',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
}

const ROLE_STATUS_MAP: Record<string, string> = {
  super_admin: 'manager_approved',  // 목사: 최종 확인 대기
  president: 'submitted',           // 회장: 협조 대기
  accountant: 'coordinator_reviewed', // 부장: 결재 대기
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: '확인',
  president: '협조',
  accountant: '결재',
}

// Supabase 쿼리 결과를 Report 타입으로 변환
const transformReports = (data: unknown[]): Report[] => {
  return data.map((item: unknown) => {
    const row = item as Record<string, unknown>
    return {
      id: row.id as string,
      title: row.title as string,
      report_date: row.report_date as string,
      status: row.status as string,
      created_at: row.created_at as string,
      departments: Array.isArray(row.departments) ? row.departments[0] : row.departments,
      users: Array.isArray(row.users) ? row.users[0] : row.users,
    } as Report
  })
}

export default function ApprovalsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [completedReports, setCompletedReports] = useState<Report[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // 현재 사용자 정보
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) return
    setUserRole(userData.role)

    // 결재 대기 목록
    if (userData.role === 'super_admin') {
      // super_admin은 모든 결재 대기 보고서 조회
      const { data: pendingReports } = await supabase
        .from('weekly_reports')
        .select(`
          id, title, report_date, status, created_at,
          departments(name, code),
          users!weekly_reports_author_id_fkey(name)
        `)
        .in('status', ['submitted', 'coordinator_reviewed', 'manager_approved'])
        .order('created_at', { ascending: false })

      setReports(transformReports(pendingReports || []))
    } else {
      const pendingStatus = ROLE_STATUS_MAP[userData.role]
      if (pendingStatus) {
        const { data: pendingReports } = await supabase
          .from('weekly_reports')
          .select(`
            id, title, report_date, status, created_at,
            departments(name, code),
            users!weekly_reports_author_id_fkey(name)
          `)
          .eq('status', pendingStatus)
          .order('created_at', { ascending: false })

        setReports(transformReports(pendingReports || []))
      }
    }

    // 처리 완료 목록 (역할에 따라 필터)
    let completedQuery = supabase
      .from('weekly_reports')
      .select(`
        id, title, report_date, status, created_at,
        departments(name, code),
        users!weekly_reports_author_id_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    // 역할별로 처리된 항목 표시
    if (userData.role === 'super_admin') {
      completedQuery = completedQuery.eq('status', 'final_approved')
    } else if (userData.role === 'president') {
      completedQuery = completedQuery.in('status', ['coordinator_reviewed', 'manager_approved', 'final_approved'])
    } else if (userData.role === 'accountant') {
      completedQuery = completedQuery.in('status', ['manager_approved', 'final_approved'])
    }

    const { data: completed } = await completedQuery
    setCompletedReports(transformReports(completed || []))

    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const getWeekNumber = (dateStr: string) => {
    const date = new Date(dateStr)
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    return Math.ceil((date.getDate() + firstDay.getDay()) / 7)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 md:h-8 bg-gray-200 rounded w-32 md:w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 md:h-20 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!userRole || !['super_admin', 'president', 'accountant'].includes(userRole)) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 text-center">
          <svg className="w-10 h-10 md:w-12 md:h-12 text-yellow-500 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-base md:text-lg font-semibold text-yellow-800 mb-2">접근 권한 없음</h3>
          <p className="text-sm md:text-base text-yellow-600">결재 권한이 있는 사용자만 접근할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  const displayReports = filter === 'pending' ? reports : completedReports

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">결재함</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            {ROLE_LABELS[userRole]} 대기 보고서를 확인하세요
          </p>
        </div>

        {/* 필터 탭 */}
        <div className="flex bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 md:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            대기중
            {reports.length > 0 && (
              <span className="ml-1.5 md:ml-2 px-1.5 md:px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {reports.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 md:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            처리완료
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-yellow-100 rounded-lg w-fit">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">{ROLE_LABELS[userRole]} 대기</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{reports.length}건</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-green-100 rounded-lg w-fit">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">처리 완료</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{completedReports.length}건</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg w-fit">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">내 역할</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {userRole === 'president' ? '회장' : userRole === 'accountant' ? '부장' : '목사'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 보고서 목록 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {displayReports.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1">
              {filter === 'pending' ? '대기 중인 보고서가 없습니다' : '처리된 보고서가 없습니다'}
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'pending' ? '모든 보고서가 처리되었습니다.' : '아직 처리한 보고서가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayReports.map((report) => {
              const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted
              const weekNum = getWeekNumber(report.report_date)

              return (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="block p-3 md:p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                >
                  {/* 모바일: 세로 레이아웃, 데스크탑: 가로 레이아웃 */}
                  <div className="flex items-start md:items-center justify-between gap-3">
                    <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0">
                      {/* 부서 뱃지 */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-bold text-xs md:text-sm">
                          {report.departments?.code || '??'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 text-sm md:text-base truncate">
                            {report.title || `${new Date(report.report_date).getMonth() + 1}월 ${weekNum}주차 보고서`}
                          </h3>
                          {/* 모바일에서 상태 뱃지를 제목 옆에 표시 */}
                          <span className={`md:hidden px-2 py-0.5 rounded-full text-xs font-medium border ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mt-1 text-xs md:text-sm text-gray-500">
                          <span>{report.departments?.name}</span>
                          <span className="hidden md:inline">·</span>
                          <span>{report.users?.name}</span>
                          <span className="hidden md:inline">·</span>
                          <span className="text-gray-400 md:text-gray-500">{formatDate(report.report_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      {/* 데스크탑에서만 상태 뱃지 표시 */}
                      <span className={`hidden md:inline-block px-3 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>

                      {/* 화살표 */}
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 md:p-4">
        <div className="flex gap-2 md:gap-3">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs md:text-sm text-blue-800">
            <p className="font-medium mb-0.5 md:mb-1">결재 흐름 안내</p>
            <p className="text-blue-600">
              팀장(제출) → 회장(협조) → 부장(결재) → 목사(확인)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
