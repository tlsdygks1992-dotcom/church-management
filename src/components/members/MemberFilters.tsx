'use client'

import { memo } from 'react'
import type { DepartmentInfo } from '@/types/shared'
import { MONTHS } from '@/lib/constants'

interface MemberFiltersProps {
  search: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  selectedDept: string
  onDeptChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  departments: DepartmentInfo[]
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onExportExcel: () => void
  selectedMonth: number | null
  onMonthClick: (month: number) => void
  birthCountByMonth: Record<number, number>
}

const MemberFilters = memo(function MemberFilters({
  search,
  onSearchChange,
  selectedDept,
  onDeptChange,
  departments,
  viewMode,
  onViewModeChange,
  onExportExcel,
  selectedMonth,
  onMonthClick,
  birthCountByMonth,
}: MemberFiltersProps) {
  return (
    <div className="bg-white rounded-2xl p-3 lg:p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* 검색 */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="이름 또는 연락처 검색"
            value={search}
            onChange={onSearchChange}
            className="w-full pl-9 lg:pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 부서 필터 */}
          <select
            value={selectedDept}
            onChange={onDeptChange}
            className="flex-1 lg:flex-none px-3 lg:px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          >
            <option value="all">전체 부서</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* 보기 모드 */}
          <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* 엑셀 내보내기 */}
          <button
            onClick={onExportExcel}
            className="p-2 lg:px-3 lg:py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-1.5 shrink-0"
            title="엑셀 내보내기"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden lg:inline text-sm font-medium">엑셀</span>
          </button>
        </div>
      </div>

      {/* 생일 월별 필터 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">생일 월별</span>
          {selectedMonth !== null && (
            <button
              onClick={() => onMonthClick(selectedMonth)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              (초기화)
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MONTHS.map((label, idx) => {
            const month = idx + 1
            const count = birthCountByMonth[month] || 0
            const isSelected = selectedMonth === month
            return (
              <button
                key={month}
                onClick={() => onMonthClick(month)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-pink-500 text-white'
                    : count > 0
                    ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1 ${isSelected ? 'text-pink-200' : 'text-pink-400'}`}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default MemberFilters
