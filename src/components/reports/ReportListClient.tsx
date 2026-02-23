'use client'

import { useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useReports, useTeamLeaderMap } from '@/queries/reports'
import { canAccessAllDepartments, canWriteReport as checkCanWriteReport, getAccessibleDepartmentIds, canViewReport } from '@/lib/permissions'

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
  weekly: { label: '주차 보고서', icon: '📋', color: 'blue' },
  meeting: { label: '모임 보고서', icon: '👥', color: 'green' },
  education: { label: '교육 보고서', icon: '📚', color: 'purple' },
  cell_leader: { label: '셀장 보고서', icon: '🏠', color: 'teal' },
  project: { label: '프로젝트 계획', icon: '📑', color: 'orange' },
}

export default function ReportListClient() {
  const { user } = useAuth()
  const { data: allDepartments = [] } = useDepartments()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isAdmin = canAccessAllDepartments(user?.role || '')
  const canWriteReport = checkCanWriteReport(user)
  const userDepartmentIds = useMemo(() => getAccessibleDepartmentIds(user), [user])

  const departments = useMemo(() => {
    if (isAdmin) return allDepartments
    return allDepartments.filter(d => userDepartmentIds.includes(d.id))
  }, [isAdmin, allDepartments, userDepartmentIds])

  // URL에서 타입/부서 읽기
  const selectedType = (searchParams.get('type') as ReportType) || 'weekly'
  const selectedDept = searchParams.get('dept') || 'all'

  // TanStack Query로 보고서 목록 조회
  const { data: reports = [], isLoading, isFetching } = useReports({
    reportType: selectedType,
    departmentId: selectedDept !== 'all' ? selectedDept : undefined,
    departmentIds: selectedDept === 'all' && !isAdmin ? userDepartmentIds : undefined,
  })

  // 팀장 ID 맵 조회 (열람 권한 필터링용)
  const { data: teamLeaderMap = {} } = useTeamLeaderMap(
    isAdmin ? [] : userDepartmentIds
  )

  // 열람 권한 필터링
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // 1. 작성 중(draft) 보고서는 오직 본인만 볼 수 있음 (관리자 포함)
      if (report.status === 'draft') {
        return user?.id === report.author_id
      }

      // 2. 그 외(제출됨 이상) 보고서는 누구나 열람 가능 (이전 수정사항 반영)
      return true
    })
  }, [reports, user])

  const handleTypeChange = useCallback((type: ReportType) => {
    const params = new URLSearchParams()
    params.set('type', type)
    if (selectedDept !== 'all') params.set('dept', selectedDept)
    router.push(`/reports?${params.toString()}`)
  }, [router, selectedDept])

  const handleDeptChange = useCallback((deptId: string) => {
    const params = new URLSearchParams()
    params.set('type', selectedType)
    if (deptId !== 'all') params.set('dept', deptId)
    router.push(`/reports?${params.toString()}`)
  }, [router, selectedType])

  if (!user) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="h-10 w-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">보고서</h1>
          <p className="text-sm text-gray-500 mt-0.5">보고서 및 프로젝트 계획 관리</p>
        </div>
        {canWriteReport && (
          <Link
            href={`/reports/new?type=${selectedType}`}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>작성</span>
          </Link>
        )}
      </div>

      {/* 유형 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((type) => {
          const config = REPORT_TYPE_CONFIG[type]
          const isActive = selectedType === type
          return (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          )
        })}
      </div>

      {/* 부서 필터 */}
      {(isAdmin || departments.length > 1) && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => handleDeptChange('all')}
            className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedDept === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleDeptChange(dept.id)}
              className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedDept === dept.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      )}

      {/* 보고서 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className={`divide-y divide-gray-100 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {filteredReports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* 아이콘 */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedType === 'weekly' ? 'bg-blue-100' :
                  selectedType === 'meeting' ? 'bg-green-100' :
                  selectedType === 'cell_leader' ? 'bg-teal-100' :
                  selectedType === 'project' ? 'bg-orange-100' : 'bg-purple-100'
                }`}>
                  <span className="text-lg">{REPORT_TYPE_CONFIG[selectedType].icon}</span>
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {selectedType === 'weekly'
                        ? report.departments?.name
                        : report.meeting_title || report.departments?.name}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <span>
                      {new Date(report.report_date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span>·</span>
                    <span className="truncate">{report.users?.name}</span>
                    {selectedType !== 'weekly' && report.departments?.name && (
                      <>
                        <span>·</span>
                        <span className="truncate">{report.departments?.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 출석 정보 (주차보고서만) */}
                {selectedType === 'weekly' && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">
                      {report.worship_attendance}
                      <span className="text-sm font-normal text-gray-400">/{report.total_registered}</span>
                    </p>
                    <p className="text-xs text-gray-400">출석</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 px-4 text-center">
            <span className="text-4xl mb-3 block">{REPORT_TYPE_CONFIG[selectedType].icon}</span>
            <p className="text-gray-500 text-sm">아직 작성된 {REPORT_TYPE_CONFIG[selectedType].label}가 없습니다.</p>
            {canWriteReport && (
              <Link href={`/reports/new?type=${selectedType}`} className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
                첫 보고서 작성하기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: '작성중', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: '제출됨', className: 'bg-yellow-100 text-yellow-700' },
    coordinator_reviewed: { label: '회장검토', className: 'bg-blue-100 text-blue-700' },
    manager_approved: { label: '부장결재', className: 'bg-purple-100 text-purple-700' },
    final_approved: { label: '승인완료', className: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', className: 'bg-red-100 text-red-700' },
    revision_requested: { label: '수정요청', className: 'bg-orange-100 text-orange-700' },
  }

  const { label, className } = config[status] || config.draft

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
