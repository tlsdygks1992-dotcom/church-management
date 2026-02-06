'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { exportMembersToExcel } from '@/lib/excel'
import type { MemberWithDepts, DepartmentInfo } from '@/types/shared'
import { useDebounce } from '@/hooks/useDebounce'
import { useDeleteMember } from '@/queries/members'
import { useToastContext } from '@/providers/ToastProvider'
import MemberGridCard from './MemberGridCard'
import MemberListItem from './MemberListItem'
import DeleteConfirmModal from './DeleteConfirmModal'
import MemberFilters from './MemberFilters'

interface MemberListProps {
  members: MemberWithDepts[]
  departments: DepartmentInfo[]
  canEdit: boolean
}

export default function MemberList({ members, departments, canEdit }: MemberListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const deleteMemberMutation = useDeleteMember()
  const toast = useToastContext()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteTarget, setDeleteTarget] = useState<MemberWithDepts | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // URL에서 파생된 상태 (useEffect 대신 직접 계산)
  const selectedDept = searchParams.get('dept') || 'all'
  const selectedMonth = useMemo(() => {
    const monthParam = searchParams.get('month')
    return monthParam ? parseInt(monthParam, 10) : null
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
      // 삭제된 항목 제외 (낙관적 업데이트)
      if (deletedIds.has(member.id)) return false

      const searchLower = debouncedSearch.toLowerCase()
      const matchesSearch = !debouncedSearch ||
        member.name.toLowerCase().includes(searchLower) ||
        member.phone?.includes(debouncedSearch)
      // 부서 필터링: member_departments 배열에서 확인
      const matchesDept = selectedDept === 'all' ||
        member.member_departments?.some(md => md.department_id === selectedDept)
      const matchesMonth = selectedMonth === null || getBirthMonth(member.birth_date) === selectedMonth
      return matchesSearch && matchesDept && matchesMonth
    })
  }, [members, debouncedSearch, selectedDept, selectedMonth, getBirthMonth, deletedIds])

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
    // URL만 업데이트 (상태는 URL에서 파생)
    const params = new URLSearchParams()
    if (newDept !== 'all') params.set('dept', newDept)
    if (selectedMonth !== null) params.set('month', selectedMonth.toString())
    router.push(`/members${params.toString() ? '?' + params.toString() : ''}`)
  }, [router, selectedMonth])

  const handleMonthClick = useCallback((month: number) => {
    const newMonth = selectedMonth === month ? null : month
    // URL만 업데이트 (상태는 URL에서 파생)
    const params = new URLSearchParams()
    if (selectedDept !== 'all') params.set('dept', selectedDept)
    if (newMonth !== null) params.set('month', newMonth.toString())
    router.push(`/members${params.toString() ? '?' + params.toString() : ''}`)
  }, [router, selectedDept, selectedMonth])

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const targetId = deleteTarget.id

    // 낙관적 업데이트 - 즉시 UI에서 제거
    setDeletedIds((prev) => new Set([...prev, targetId]))
    setDeleteTarget(null)

    deleteMemberMutation.mutate(targetId, {
      onSuccess: () => {
        startTransition(() => {
          router.refresh()
        })
      },
      onError: (err) => {
        // 실패 시 롤백
        setDeletedIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
        console.error('Failed to delete member:', err)
        toast.error('삭제 중 오류가 발생했습니다.')
      },
    })
  }, [deleteTarget, deleteMemberMutation, router])

  const handleExportExcel = useCallback(() => {
    const exportData = filteredMembers.map(member => ({
      name: member.name,
      phone: member.phone,
      birthDate: member.birth_date || '',
      department: member.member_departments?.map(md => md.departments?.name).filter(Boolean).join(', ') || '',
      isActive: member.is_active ? '활동' : '비활동',
      joinedAt: new Date(member.joined_at).toLocaleDateString('ko-KR'),
    }))
    exportMembersToExcel(exportData)
  }, [filteredMembers])

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* 필터 영역 */}
      <MemberFilters
        search={search}
        onSearchChange={handleSearchChange}
        selectedDept={selectedDept}
        onDeptChange={handleDeptChange}
        departments={departments}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExportExcel={handleExportExcel}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        birthCountByMonth={birthCountByMonth}
      />

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
      <DeleteConfirmModal
        member={deleteTarget}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
