'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Department {
  id: string
  name: string
}

interface MemberItem {
  id: string
  name: string
  phone: string | null
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
const MemberGridCard = memo(function MemberGridCard({ member }: { member: MemberItem }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:shadow-md transition-shadow"
    >
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
  )
})

// 메모이제이션된 리스트 아이템
const MemberListItem = memo(function MemberListItem({ member }: { member: MemberItem }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="flex items-center gap-3 p-3 lg:p-4 active:bg-gray-50 transition-colors"
    >
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
  )
})

export default function MemberList({ members, departments }: MemberListProps) {
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 검색어 디바운스 (300ms)
  const debouncedSearch = useDebounce(search, 300)

  // 필터링 메모이제이션
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchLower = debouncedSearch.toLowerCase()
      const matchesSearch = !debouncedSearch ||
        member.name.toLowerCase().includes(searchLower) ||
        member.phone?.includes(debouncedSearch)
      const matchesDept = selectedDept === 'all' || member.department_id === selectedDept
      return matchesSearch && matchesDept
    })
  }, [members, debouncedSearch, selectedDept])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const handleDeptChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDept(e.target.value)
  }, [])

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* 필터 영역 */}
      <div className="bg-white rounded-2xl p-3 lg:p-4 shadow-sm border border-gray-100">
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
            <MemberGridCard key={member.id} member={member} />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredMembers.map((member) => (
              <MemberListItem key={member.id} member={member} />
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
    </div>
  )
}
