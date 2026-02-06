'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { MemberWithDepts } from '@/types/shared'

interface MemberListItemProps {
  member: MemberWithDepts
  deptParam: string
  canEdit: boolean
  onDelete: (member: MemberWithDepts) => void
}

const MemberListItem = memo(function MemberListItem({
  member,
  deptParam,
  canEdit,
  onDelete,
}: MemberListItemProps) {
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
            <span className="truncate">
              {member.member_departments?.map(md => md.departments?.name).filter(Boolean).join(' · ') || '-'}
            </span>
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

export default MemberListItem
