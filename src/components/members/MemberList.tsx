'use client'

import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { exportMembersToExcel } from '@/lib/excel'
import { createClient } from '@/lib/supabase/client'

interface Department {
  id: string
  name: string
}

interface MemberItem {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  photo_url: string | null
  department_id: string
  is_active: boolean
  joined_at: string
  departments: { name: string } | null
}

interface MemberListProps {
  members: MemberItem[]
  departments: Department[]
  canEdit: boolean
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 메모이제이션된 그리드 카드
const MemberGridCard = memo(function MemberGridCard({
  member,
  deptParam,
  canEdit,
  onDelete,
}: {
  member: MemberItem
  deptParam: string
  canEdit: boolean
  onDelete: (member: MemberItem) => void
}) {
  const href = deptParam && deptParam !== 'all'
    ? `/members/${member.id}?dept=${deptParam}`
    : `/members/${member.id}`

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group">
      <Link href={href} className="block">
        <div className="aspect-square bg-gray-100 relative">
          {member.photo_url ? (
            <Image
              src={member.photo_url}
              alt={member.name}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <span className="text-2xl lg:text-4xl font-bold text-gray-500">
                {member.name.charAt(0)}
              </span>
            </div>
          )}
          {!member.is_active && (
            <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-gray-800/70 text-white text-[10px] lg:text-xs px-1.5 py-0.5 lg:px-2 lg:py-1 rounded">
              비활성
            </div>
          )}
        </div>
        <div className="p-2 lg:p-3">
          <p className="font-semibold text-gray-900 truncate text-xs lg:text-sm">{member.name}</p>
          <p className="text-[10px] lg:text-sm text-gray-500 truncate">{member.departments?.name}</p>
        </div>
      </Link>
      {canEdit && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(member)
          }}
          className="absolute top-1 left-1 lg:top-2 lg:left-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
          title="삭제"
        >
          <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
})

// 메모이제이션된 리스트 아이템
const MemberListItem = memo(function MemberListItem({
  member,
  deptParam,
  canEdit,
  onDelete,
}: {
  member: MemberItem
  deptParam: string
  canEdit: boolean
  onDelete: (member: MemberItem) => void
}) {
  const href = deptParam && deptParam !== 'all'
    ? `/members/${member.id}?dept=${deptParam}`
    : `/members/${member.id}`

  return (
    <div className="flex items-center gap-3 p-3 lg:p-4 hover:bg-gray-50 transition-colors group">
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 relative">
          {member.photo_url ? (
            <Image
              src={member.photo_url}
              alt={member.name}
              fill
              sizes="48px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <span className="text-sm lg:text-base font-bold text-gray-500">
                {member.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm lg:text-base">{member.name}</p>
          <div className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-500 mt-0.5">
            <span className="truncate">{member.departments?.name}</span>
            {member.phone && (
              <>
                <span className="hidden lg:inline">·</span>
                <span className="hidden lg:inline">{member.phone}</span>
              </>
            )}
          </div>
        </div>
        {!member.is_active && (
          <span className="text-[10px] lg:text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            비활성
          </span>
        )}
        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {canEdit && (
        <button
          onClick={() => onDelete(member)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="삭제"
        >
          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
})

export default function MemberList({ members, departments, canEdit }: MemberListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteTarget, setDeleteTarget] = useState<MemberItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // URL에서 부서 필터 초기화
  useEffect(() => {
    const deptFromUrl = searchParams.get('dept')
    if (deptFromUrl) {
      setSelectedDept(deptFromUrl)
    }
    const monthFromUrl = searchParams.get('month')
    if (monthFromUrl) {
      setSelectedMonth(parseInt(monthFromUrl, 10))
    }
  }, [searchParams])

  // 검색어 디바운스 (300ms)
  const debouncedSearch = useDebounce(search, 300)

  // 생일 월 추출 함수
  const getBirthMonth = useCallback((birthDate: string | null): number | null => {
    if (!birthDate) return null
    const date = new Date(birthDate)
    return date.getMonth() + 1 // 0-indexed이므로 +1
  }, [])

  // 필터링 메모이제이션
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchLower = debouncedSearch.toLowerCase()
      const matchesSearch = !debouncedSearch ||
        member.name.toLowerCase().includes(searchLower) ||
        member.phone?.includes(debouncedSearch)
      const matchesDept = selectedDept === 'all' || member.department_id === selectedDept
      const matchesMonth = selectedMonth === null || getBirthMonth(member.birth_date) === selectedMonth
      return matchesSearch && matchesDept && matchesMonth
    })
  }, [members, debouncedSearch, selectedDept, selectedMonth, getBirthMonth])

  // 월별 생일자 수 계산
  const birthCountByMonth = useMemo(() => {
    const counts: Record<number, number> = {}
    members.forEach((member) => {
      const month = getBirthMonth(member.birth_date)
      if (month) {
        counts[month] = (counts[month] || 0) + 1
      }
    })
    return counts
  }, [members, getBirthMonth])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const handleDeptChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value
    setSelectedDept(newDept)
    // URL 업데이트
    const params = new URLSearchParams()
    if (newDept !== 'all') params.set('dept', newDept)
    if (selectedMonth !== null) params.set('month', selectedMonth.toString())
    router.push(`/members${params.toString() ? '?' + params.toString() : ''}`)
  }, [router, selectedMonth])

  const handleMonthClick = useCallback((month: number) => {
    const newMonth = selectedMonth === month ? null : month
    setSelectedMonth(newMonth)
    // URL 업데이트
    const params = new URLSearchParams()
    if (selectedDept !== 'all') params.set('dept', selectedDept)
    if (newMonth !== null) params.set('month', newMonth.toString())
    router.push(`/members${params.toString() ? '?' + params.toString() : ''}`)
  }, [router, selectedDept, selectedMonth])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete member:', err)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, supabase, router])

  const handleExportExcel = useCallback(() => {
    const exportData = filteredMembers.map(member => ({
      name: member.name,
      phone: member.phone,
      birthDate: member.birth_date || '',
      department: member.departments?.name || '',
      isActive: member.is_active ? '활동' : '비활동',
      joinedAt: new Date(member.joined_at).toLocaleDateString('ko-KR'),
    }))
    exportMembersToExcel(exportData)
  }, [filteredMembers])

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* 필터 영역 */}
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
              onChange={handleSearchChange}
              className="w-full pl-9 lg:pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* 부서 필터 */}
            <select
              value={selectedDept}
              onChange={handleDeptChange}
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
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 엑셀 내보내기 */}
            <button
              onClick={handleExportExcel}
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
                onClick={() => handleMonthClick(selectedMonth)}
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
                  onClick={() => handleMonthClick(month)}
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

      {/* 결과 */}
      <p className="text-xs lg:text-sm text-gray-500">
        {filteredMembers.length}명
      </p>

      {/* 그리드 뷰 */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 lg:gap-4">
          {filteredMembers.map((member) => (
            <MemberGridCard
              key={member.id}
              member={member}
              deptParam={selectedDept}
              canEdit={canEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredMembers.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                deptParam={selectedDept}
                canEdit={canEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="bg-white rounded-2xl p-6 lg:p-8 text-center shadow-sm border border-gray-100">
          <svg className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">교인 삭제</h3>
              <p className="text-gray-500 text-sm mb-6">
                <strong className="text-gray-700">{deleteTarget.name}</strong>님을 삭제하시겠습니까?
                <br />
                <span className="text-red-500">이 작업은 되돌릴 수 없습니다.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
