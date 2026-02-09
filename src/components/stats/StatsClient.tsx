'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { exportStatsToExcel } from '@/lib/excel'
import { ChartSkeleton } from '@/components/ui/Skeleton'
import CellFilter from '@/components/ui/CellFilter'
import {
  computeDepartmentStats,
  computeWeeklyTrend,
  getStartDate,
  type DepartmentStats,
  type WeeklyStats,
} from '@/lib/stats-queries'

type TabType = 'attendance' | 'reports'
type Period = 'month' | 'quarter' | 'year'

// 출결 차트 동적 임포트
const WeeklyTrendChart = dynamic(
  () => import('@/components/stats/StatsCharts').then(mod => ({ default: mod.WeeklyTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const AttendanceDistributionCharts = dynamic(
  () => import('@/components/stats/StatsCharts').then(mod => ({ default: mod.AttendanceDistributionCharts })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const DepartmentComparisonChart = dynamic(
  () => import('@/components/stats/StatsCharts').then(mod => ({ default: mod.DepartmentComparisonChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

// 보고서 통계 동적 임포트
const ReportStatsContent = dynamic(
  () => import('@/components/stats/ReportStatsContent'),
  { ssr: false, loading: () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 md:h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <ChartSkeleton />
    </div>
  )}
)

interface Department {
  id: string
  name: string
  code: string
}

interface StatsClientProps {
  departments: Department[]
  initialDepartmentStats: DepartmentStats[]
  initialWeeklyStats: WeeklyStats[]
}

export default function StatsClient({
  departments,
  initialDepartmentStats,
  initialWeeklyStats,
}: StatsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedCell, setSelectedCell] = useState<string>('all')
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>(initialWeeklyStats)
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>(initialDepartmentStats)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<Period>('month')

  // 통계 재로드 (필터 변경 시)
  const loadStats = useCallback(async (dept: string, cell: string, p: Period) => {
    setLoading(true)
    const supabase = createClient()
    const startDate = getStartDate(p)

    const [deptStats, weekly] = await Promise.all([
      computeDepartmentStats(supabase, departments, startDate, p),
      computeWeeklyTrend(supabase, dept, cell, startDate),
    ])

    setDepartmentStats(deptStats)
    setWeeklyStats(weekly)
    setLoading(false)
  }, [departments])

  const handleDeptChange = useCallback((dept: string) => {
    setSelectedDept(dept)
    setSelectedCell('all')
    loadStats(dept, 'all', period)
  }, [loadStats, period])

  const handleCellChange = useCallback((cell: string) => {
    setSelectedCell(cell)
    loadStats(selectedDept, cell, period)
  }, [loadStats, selectedDept, period])

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
    loadStats(selectedDept, selectedCell, p)
  }, [loadStats, selectedDept, selectedCell])

  // 전체 통계 계산
  const { totalWorshipCount, totalMeetingCount, totalMemberCount, avgWorshipRate, avgMeetingRate } = useMemo(() => {
    const worshipCount = departmentStats.reduce((sum, d) => sum + d.worshipCount, 0)
    const meetingCount = departmentStats.reduce((sum, d) => sum + d.meetingCount, 0)
    const memberCount = departmentStats.reduce((sum, d) => sum + d.totalMembers, 0)
    const worshipRate = departmentStats.length > 0
      ? Math.round(departmentStats.reduce((sum, d) => sum + d.worshipRate, 0) / departmentStats.length)
      : 0
    const meetingRate = departmentStats.length > 0
      ? Math.round(departmentStats.reduce((sum, d) => sum + d.meetingRate, 0) / departmentStats.length)
      : 0
    return {
      totalWorshipCount: worshipCount,
      totalMeetingCount: meetingCount,
      totalMemberCount: memberCount,
      avgWorshipRate: worshipRate,
      avgMeetingRate: meetingRate
    }
  }, [departmentStats])

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">통계</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            {activeTab === 'attendance' ? '부서별 출석률과 추이를 확인하세요' : '보고서 제출 현황과 결재 통계를 확인하세요'}
          </p>
        </div>

        {/* 필터 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <select
            value={selectedDept}
            onChange={(e) => handleDeptChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">전체 부서</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <CellFilter
            departments={departments}
            selectedDeptId={selectedDept}
            selectedCellId={selectedCell}
            onCellChange={handleCellChange}
          />

          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p === 'month' ? '월간' : p === 'quarter' ? '분기' : '연간'}
              </button>
            ))}
          </div>

          {activeTab === 'attendance' && (
            <button
              onClick={() => {
                const periodName = period === 'month' ? '월간' : period === 'quarter' ? '분기' : '연간'
                exportStatsToExcel(departmentStats, periodName)
              }}
              className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">엑셀</span>
            </button>
          )}
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          출결 통계
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          보고서 통계
        </button>
      </div>

      {/* 보고서 통계 탭 */}
      {activeTab === 'reports' && (
        <ReportStatsContent
          departments={departments}
          selectedDept={selectedDept}
          period={period}
        />
      )}

      {/* 출결 통계 탭 */}
      {activeTab === 'attendance' && <>

      {/* 로딩 오버레이 (필터 변경 시) */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">통계 계산 중...</span>
        </div>
      )}

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">총 재적</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalMemberCount}명</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">예배 출석</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{totalWorshipCount}회</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">평균 {avgWorshipRate}%</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">모임 출석</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-600">{totalMeetingCount}회</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">평균 {avgMeetingRate}%</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">부서 수</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-purple-600">{departments.length}개</p>
        </div>
      </div>

      {/* 주간 추이 차트 */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">주간 출석 추이</h3>
        <WeeklyTrendChart data={weeklyStats} />
      </div>

      {/* 부서별 출석 분포 */}
      <AttendanceDistributionCharts data={departmentStats} />

      {/* 부서별 출석률 비교 */}
      <DepartmentComparisonChart data={departmentStats} />

      {/* 부서별 상세 비교 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">부서별 출석 현황</h3>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden divide-y divide-gray-100">
          {departmentStats.map((dept, index) => (
            <div key={index} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs">
                  {dept.code}
                </span>
                <span className="font-medium text-gray-900">{dept.department}</span>
                <span className="ml-auto text-xs text-gray-500">재적 {dept.totalMembers}명</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>예배</span>
                    <span className="text-blue-600 font-medium">{dept.worshipCount}회 ({dept.worshipRate}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dept.worshipRate}%` }}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>모임</span>
                    <span className="text-green-600 font-medium">{dept.meetingCount}회 ({dept.meetingRate}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${dept.meetingRate}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 데스크탑: 테이블 뷰 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">부서</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">재적</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">예배 출석</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">예배 출석률</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">모임 출석</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">모임 출석률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentStats.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs">
                        {dept.code}
                      </span>
                      <span className="font-medium text-gray-900">{dept.department}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{dept.totalMembers}명</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">{dept.worshipCount}회</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dept.worshipRate}%` }}></div>
                      </div>
                      <span className="text-gray-600">{dept.worshipRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{dept.meetingCount}회</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${dept.meetingRate}%` }}></div>
                      </div>
                      <span className="text-gray-600">{dept.meetingRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {departmentStats.length === 0 && (
          <div className="p-6 md:p-8 text-center text-sm text-gray-500">
            부서 데이터가 없습니다.
          </div>
        )}
      </div>

      </>}
    </div>
  )
}
