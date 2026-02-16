'use client'

import { memo, useCallback } from 'react'

export interface MemberAttendanceItem {
  memberId: string
  name: string
  photoUrl: string | null
  isPresent: boolean
}

interface Props {
  memberAttendance: MemberAttendanceItem[]
  onToggle: (memberId: string) => void
  onBulkAction: (allPresent: boolean) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

// 개별 셀원 행 (memo로 성능 최적화)
const MemberRow = memo(function MemberRow({
  member,
  onToggle,
}: {
  member: MemberAttendanceItem
  onToggle: (memberId: string) => void
}) {
  const handleClick = useCallback(() => {
    onToggle(member.memberId)
  }, [member.memberId, onToggle])

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* 프로필 사진 */}
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium">
            {member.name.charAt(0)}
          </div>
        )}
        <span className="text-sm font-medium text-gray-900">{member.name}</span>
      </div>
      {/* 출석 토글 버튼 */}
      <button
        type="button"
        onClick={handleClick}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          member.isPresent
            ? 'bg-green-100 text-green-600 hover:bg-green-200'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
      >
        {member.isPresent ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  )
})

export default function CellMemberAttendance({
  memberAttendance,
  onToggle,
  onBulkAction,
  sectionRef,
}: Props) {
  const presentCount = memberAttendance.filter(m => m.isPresent).length
  const totalCount = memberAttendance.length

  return (
    <div
      ref={sectionRef}
      data-section="cell-attendance"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-base md:text-lg">
          셀원 출석{' '}
          <span className="text-sm font-normal text-gray-500">
            ({presentCount}/{totalCount}명)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onBulkAction(true)}
            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            전체 출석
          </button>
          <button
            type="button"
            onClick={() => onBulkAction(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 셀원 목록 */}
      {totalCount > 0 ? (
        <div className="divide-y divide-gray-100">
          {memberAttendance.map((member) => (
            <MemberRow
              key={member.memberId}
              member={member}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          셀원이 없습니다. 셀을 먼저 선택해주세요.
        </div>
      )}
    </div>
  )
}
