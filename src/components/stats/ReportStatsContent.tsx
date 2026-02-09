'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/Skeleton'
import type {
  StatusDistribution,
  WeeklyReportTrend,
  DeptReportStats,
  ApprovalDuration,
} from './ReportStatsCharts'

// 차트 컴포넌트 동적 임포트
const StatusDistributionChart = dynamic(
  () => import('./ReportStatsCharts').then(mod => ({ default: mod.StatusDistributionChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const ReportTrendChart = dynamic(
  () => import('./ReportStatsCharts').then(mod => ({ default: mod.ReportTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const DeptSubmissionChart = dynamic(
  () => import('./ReportStatsCharts').then(mod => ({ default: mod.DeptSubmissionChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const ApprovalDurationChart = dynamic(
  () => import('./ReportStatsCharts').then(mod => ({ default: mod.ApprovalDurationChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  coordinator_reviewed: '회장 협조',
  manager_approved: '부장 결재',
  final_approved: '완료',
  rejected: '반려',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  submitted: '#f59e0b',
  coordinator_reviewed: '#3b82f6',
  manager_approved: '#8b5cf6',
  final_approved: '#22c55e',
  rejected: '#ef4444',
}

interface Department {
  id: string
  name: string
  code: string
}

interface ReportRow {
  id: string
  department_id: string
  report_date: string
  status: string
  submitted_at: string | null
  final_approved_at: string | null
  created_at: string
  departments: { name: string; code: string } | null
}

interface ReportStatsContentProps {
  departments: Department[]
  selectedDept: string
  period: 'month' | 'quarter' | 'year'
}

export default function ReportStatsContent({
  departments,
  selectedDept,
  period,
}: ReportStatsContentProps) {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const getStartDate = useCallback(() => {
    const now = new Date()
    if (period === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1)
    }
    return new Date(now.getFullYear(), 0, 1)
  }, [period])

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      const startDate = getStartDate().toISOString().split('T')[0]

      let query = supabase
        .from('weekly_reports')
        .select('id, department_id, report_date, status, submitted_at, final_approved_at, created_at, departments(name, code)')
        .gte('report_date', startDate)
        .order('report_date', { ascending: true })

      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept)
      }

      const { data } = await query
      setReports((data as ReportRow[]) || [])
      setLoading(false)
    }

    loadReports()
  }, [supabase, selectedDept, period, getStartDate])

  // 기간 내 주(week) 수 계산
  const weeksInPeriod = useMemo(() => {
    const startDate = getStartDate()
    const now = new Date()
    const diffMs = now.getTime() - startDate.getTime()
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
  }, [getStartDate])

  // 1. 결재 상태 분포
  const statusDistribution: StatusDistribution[] = useMemo(() => {
    const counts: Record<string, number> = {}
    reports.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1
    })

    return Object.entries(STATUS_LABELS).map(([status, label]) => ({
      status,
      label,
      count: counts[status] || 0,
      color: STATUS_COLORS[status] || '#6b7280',
    }))
  }, [reports])

  // 2. 기간별 제출 추이 (주별)
  const weeklyTrend: WeeklyReportTrend[] = useMemo(() => {
    const weekMap = new Map<string, { submitted: number; approved: number; rejected: number }>()

    reports.forEach(r => {
      // draft는 제출되지 않은 것이므로 제외
      if (r.status === 'draft') return

      const date = new Date(r.report_date)
      const day = date.getDay()
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - day)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { submitted: 0, approved: 0, rejected: 0 })
      }
      const stats = weekMap.get(weekKey)!
      stats.submitted++
      if (r.status === 'final_approved' || r.status === 'manager_approved' || r.status === 'coordinator_reviewed') {
        stats.approved++
      }
      if (r.status === 'rejected') {
        stats.rejected++
      }
    })

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => {
        const date = new Date(week)
        return {
          week: `${date.getMonth() + 1}/${date.getDate()}`,
          ...data,
        }
      })
  }, [reports])

  // 3. 부서별 제출률 비교
  const deptReportStats: DeptReportStats[] = useMemo(() => {
    // 전체 부서 보기일 때만 의미 있음
    const targetDepts = selectedDept === 'all'
      ? departments
      : departments.filter(d => d.id === selectedDept)

    return targetDepts.map(dept => {
      const deptReports = reports.filter(r => r.department_id === dept.id)
      // draft가 아닌 제출된 보고서
      const submitted = deptReports.filter(r => r.status !== 'draft')
      // 최종 승인된 보고서
      const approved = deptReports.filter(r => r.status === 'final_approved')

      // 기간 내 예상 보고서 수 = 주(week) 수 (매주 1건 예상)
      const totalExpected = weeksInPeriod

      return {
        department: dept.name,
        code: dept.code,
        totalExpected,
        submittedCount: submitted.length,
        approvedCount: approved.length,
        submissionRate: totalExpected > 0 ? Math.round((submitted.length / totalExpected) * 100) : 0,
        approvalRate: submitted.length > 0 ? Math.round((approved.length / submitted.length) * 100) : 0,
      }
    })
  }, [reports, departments, selectedDept, weeksInPeriod])

  // 4. 결재 소요 시간
  const approvalDurations: ApprovalDuration[] = useMemo(() => {
    const targetDepts = selectedDept === 'all'
      ? departments
      : departments.filter(d => d.id === selectedDept)

    return targetDepts
      .map(dept => {
        const approved = reports.filter(
          r => r.department_id === dept.id && r.status === 'final_approved' && r.submitted_at && r.final_approved_at
        )

        if (approved.length === 0) {
          return { department: dept.name, avgHours: 0, minHours: 0, maxHours: 0 }
        }

        const hours = approved.map(r => {
          const submitted = new Date(r.submitted_at!).getTime()
          const finalApproved = new Date(r.final_approved_at!).getTime()
          return Math.max(0, (finalApproved - submitted) / (1000 * 60 * 60))
        })

        return {
          department: dept.name,
          avgHours: Math.round(hours.reduce((a, b) => a + b, 0) / hours.length),
          minHours: Math.round(Math.min(...hours)),
          maxHours: Math.round(Math.max(...hours)),
        }
      })
      .filter(d => d.avgHours > 0)
  }, [reports, departments, selectedDept])

  // 요약 통계
  const summary = useMemo(() => {
    const total = reports.length
    const submitted = reports.filter(r => r.status !== 'draft').length
    const approved = reports.filter(r => r.status === 'final_approved').length
    const rejected = reports.filter(r => r.status === 'rejected').length
    const pending = reports.filter(r =>
      r.status === 'submitted' || r.status === 'coordinator_reviewed' || r.status === 'manager_approved'
    ).length

    return { total, submitted, approved, rejected, pending }
  }, [reports])

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 md:h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">전체 보고서</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.total}건</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">승인 완료</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-600">{summary.approved}건</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            {summary.submitted > 0 ? Math.round((summary.approved / summary.submitted) * 100) : 0}% 승인률
          </p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-amber-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">결재 대기</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-600">{summary.pending}건</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-red-100 rounded-lg">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs md:text-sm text-gray-500">반려</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-600">{summary.rejected}건</p>
        </div>
      </div>

      {/* 결재 상태 분포 파이 차트 */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">결재 상태 분포</h3>
        <StatusDistributionChart data={statusDistribution} />
      </div>

      {/* 기간별 제출 추이 */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">주간 보고서 추이</h3>
        <ReportTrendChart data={weeklyTrend} />
      </div>

      {/* 부서별 제출률 비교 */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">부서별 제출률 비교</h3>
        <DeptSubmissionChart data={deptReportStats} />
      </div>

      {/* 결재 소요 시간 */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
          결재 소요 시간
          <span className="text-xs md:text-sm font-normal text-gray-500 ml-2">제출 → 최종 승인</span>
        </h3>
        <ApprovalDurationChart data={approvalDurations} />
      </div>

      {/* 부서별 상세 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">부서별 보고서 현황</h3>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden divide-y divide-gray-100">
          {deptReportStats.map((dept) => (
            <div key={dept.code} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {dept.code}
                </span>
                <span className="font-medium text-gray-900">{dept.department}</span>
                <span className="ml-auto text-xs text-gray-500">예상 {dept.totalExpected}건</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>제출</span>
                    <span className="text-blue-600 font-medium">{dept.submittedCount}건 ({dept.submissionRate}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, dept.submissionRate)}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>승인</span>
                    <span className="text-green-600 font-medium">{dept.approvedCount}건 ({dept.approvalRate}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, dept.approvalRate)}%` }} />
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
                <th className="px-4 py-3 text-center font-semibold text-gray-700">예상</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">제출</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">제출률</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">승인</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">승인률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deptReportStats.map((dept) => (
                <tr key={dept.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {dept.code}
                      </span>
                      <span className="font-medium text-gray-900">{dept.department}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{dept.totalExpected}건</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">{dept.submittedCount}건</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, dept.submissionRate)}%` }} />
                      </div>
                      <span className="text-gray-600">{dept.submissionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{dept.approvedCount}건</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, dept.approvalRate)}%` }} />
                      </div>
                      <span className="text-gray-600">{dept.approvalRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deptReportStats.length === 0 && (
          <div className="p-6 md:p-8 text-center text-sm text-gray-500">
            부서 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
