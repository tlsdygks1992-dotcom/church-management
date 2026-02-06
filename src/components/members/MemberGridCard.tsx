'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { MemberWithDepts } from '@/types/shared'

interface MemberGridCardProps {
  member: MemberWithDepts
  deptParam: string
  canEdit: boolean
  onDelete: (member: MemberWithDepts) => void
}

const MemberGridCard = memo(function MemberGridCard({
  member,
  deptParam,
  canEdit,
  onDelete,
}: MemberGridCardProps) {
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
          <p className="text-[10px] lg:text-sm text-gray-500 truncate">
            {member.member_departments?.map(md => md.departments?.name).filter(Boolean).join(' · ') || '-'}
          </p>
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

export default MemberGridCard
