'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Department {
  id: string
  name: string
  code: string
}

interface WeeklyStats {
  week: string
  worship: number
  meeting: number
  total: number
}

interface DepartmentStats {
  department: string
  code: string
  totalMembers: number
  worshipCount: number
  meetingCount: number
  worshipRate: number
  meetingRate: number
}

export default function StatsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const supabase = createClient()

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    loadStats()
  }, [selectedDept, period])

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name')

    setDepartments(data || [])
  }

  const loadStats = async () => {
    setLoading(true)

    // 기간 계산
    const now = new Date()
    let startDate: Date

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    const startDateStr = startDate.toISOString().split('T')[0]

    // 부서별 통계
    await loadDepartmentStats(startDateStr)

    // 주간 추이
    await loadWeeklyTrend(startDateStr)

    setLoading(false)
  }

  const loadDepartmentStats = async (startDate: string) => {
    // 모든 부서의 멤버 수 조회
    const { data: allMembers } = await supabase
      .from('members')
      .select('id, department_id')
      .eq('is_active', true)

    // 출결 기록 조회
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('member_id, attendance_type, is_present, attendance_date, members!inner(department_id)')
      .gte('attendance_date', startDate)
      .eq('is_present', true)

    const { data: attendance } = await attendanceQuery

    // 부서별 집계
    const deptMap = new Map<string, { worship: number; meeting: number; total: number }>()

    departments.forEach(dept => {
      const memberCount = (allMembers || []).filter(m => m.department_id === dept.id).length
      deptMap.set(dept.id, { worship: 0, meeting: 0, total: memberCount })
    })

    ;(attendance || []).forEach((record: any) => {
      const deptId = record.members?.department_id
      if (deptId && deptMap.has(deptId)) {
        const stats = deptMap.get(deptId)!
        if (record.attendance_type === 'worship') {
          stats.worship++
        } else if (record.attendance_type === 'meeting') {
          stats.meeting++
        }
      }
    })

    const stats: DepartmentStats[] = departments.map(dept => {
      const data = deptMap.get(dept.id) || { worship: 0, meeting: 0, total: 0 }
      // 기간 내 주 수 계산 (대략)
      const weeks = period === 'month' ? 4 : period === 'quarter' ? 13 : 52
      const expectedAttendance = data.total * weeks

      return {
        department: dept.name,
        code: dept.code,
        totalMembers: data.total,
        worshipCount: data.worship,
        meetingCount: data.meeting,
        worshipRate: expectedAttendance > 0 ? Math.round((data.worship / expectedAttendance) * 100) : 0,
        meetingRate: expectedAttendance > 0 ? Math.round((data.meeting / expectedAttendance) * 100) : 0,
      }
    })

    setDepartmentStats(stats)
  }

  const loadWeeklyTrend = async (startDate: string) => {
    let query = supabase
      .from('attendance_records')
      .select('attendance_date, attendance_type, is_present, member_id')
      .gte('attendance_date', startDate)
      .eq('is_present', true)

    if (selectedDept !== 'all') {
      // 선택된 부서의 멤버만 필터
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('department_id', selectedDept)

      if (members && members.length > 0) {
        query = query.in('member_id', members.map(m => m.id))
      }
    }

    const { data: attendance } = await query

    // 주별 그룹핑
    const weekMap = new Map<string, { worship: number; meeting: number }>()

    ;(attendance || []).forEach(record => {
      const date = new Date(record.attendance_date)
      const weekStart = getWeekStart(date)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { worship: 0, meeting: 0 })
      }

      const stats = weekMap.get(weekKey)!
      if (record.attendance_type === 'worship') {
        stats.worship++
      } else if (record.attendance_type === 'meeting') {
        stats.meeting++
      }
    })

    // 재적 인원 조회
    let totalQuery = supabase
      .from('members')
      .select('id')
      .eq('is_active', true)

    if (selectedDept !== 'all') {
      totalQuery = totalQuery.eq('department_id', selectedDept)
    }

    const { data: totalMembers } = await totalQuery
    const total = totalMembers?.length || 0

    // 정렬된 주간 통계
    const stats = Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => ({
        week: formatWeek(week),
        worship: data.worship,
        meeting: data.meeting,
        total,
      }))

    setWeeklyStats(stats)
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const formatWeek = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const maxValue = Math.max(
    ...weeklyStats.flatMap(s => [s.worship, s.meeting]),
    1
  )

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4 md:space-y-6">
          <div className="h-6 md:h-8 bg-gray-200 rounded w-32"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 md:h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="h-48 md:h-64 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  // 전체 통계 계산
  const totalWorshipCount = departmentStats.reduce((sum, d) => sum + d.worshipCount, 0)
  const totalMeetingCount = departmentStats.reduce((sum, d) => sum + d.meetingCount, 0)
  const totalMemberCount = departmentStats.reduce((sum, d) => sum + d.totalMembers, 0)
  const avgWorshipRate = departmentStats.length > 0
    ? Math.round(departmentStats.reduce((sum, d) => sum + d.worshipRate, 0) / departmentStats.length)
    : 0
  const avgMeetingRate = departmentStats.length > 0
    ? Math.round(departmentStats.reduce((sum, d) => sum + d.meetingRate, 0) / departmentStats.length)
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">출결 통계</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">부서별 출석률과 추이를 확인하세요</p>
        </div>

        {/* 필터 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">전체 부서</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
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
        </div>
      </div>

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

        {weeklyStats.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {/* 범례 */}
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">예배</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">모임</span>
              </div>
            </div>

            {/* 간단한 바 차트 */}
            <div className="space-y-2 md:space-y-3">
              {weeklyStats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2 md:gap-4">
                  <div className="w-12 md:w-16 text-xs md:text-sm text-gray-500 font-medium flex-shrink-0">{stat.week}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div
                        className="h-4 md:h-5 bg-blue-500 rounded"
                        style={{ width: `${Math.max((stat.worship / maxValue) * 100, 2)}%` }}
                      ></div>
                      <span className="text-xs text-gray-500">{stat.worship}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div
                        className="h-4 md:h-5 bg-green-500 rounded"
                        style={{ width: `${Math.max((stat.meeting / maxValue) * 100, 2)}%` }}
                      ></div>
                      <span className="text-xs text-gray-500">{stat.meeting}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 md:py-8 text-sm text-gray-500">
            해당 기간의 출결 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* 부서별 비교 */}
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
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${dept.worshipRate}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-600">{dept.worshipRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{dept.meetingCount}회</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${dept.meetingRate}%` }}
                        ></div>
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
    </div>
  )
}
