'use client'

import { memo } from 'react'
import type { Newcomer } from './types'

// 데스크톱용 새신자 행
const NewcomerRowDesktop = memo(function NewcomerRowDesktop({
  newcomer,
  index,
  onUpdate,
  onRemove,
}: {
  newcomer: Newcomer
  index: number
  onUpdate: (index: number, field: keyof Newcomer, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="tel"
          value={newcomer.phone}
          onChange={(e) => onUpdate(index, 'phone', e.target.value)}
          placeholder="010-0000-0000"
          className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="date"
          value={newcomer.birth_date}
          onChange={(e) => onUpdate(index, 'birth_date', e.target.value)}
          className="w-32 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.introducer}
          onChange={(e) => onUpdate(index, 'introducer', e.target.value)}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.address}
          onChange={(e) => onUpdate(index, 'address', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.affiliation}
          onChange={(e) => onUpdate(index, 'affiliation', e.target.value)}
          className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

// 모바일용 새신자 카드
const NewcomerCardMobile = memo(function NewcomerCardMobile({
  newcomer,
  index,
  onUpdate,
  onRemove,
}: {
  newcomer: Newcomer
  index: number
  onUpdate: (index: number, field: keyof Newcomer, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">새신자 {index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">이름 *</label>
          <input
            type="text"
            value={newcomer.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">연락처</label>
          <input
            type="tel"
            value={newcomer.phone}
            onChange={(e) => onUpdate(index, 'phone', e.target.value)}
            placeholder="010-0000-0000"
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">생년월일</label>
          <input
            type="date"
            value={newcomer.birth_date}
            onChange={(e) => onUpdate(index, 'birth_date', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">인도자</label>
          <input
            type="text"
            value={newcomer.introducer}
            onChange={(e) => onUpdate(index, 'introducer', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">주소</label>
        <input
          type="text"
          value={newcomer.address}
          onChange={(e) => onUpdate(index, 'address', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">소속(직업)</label>
        <input
          type="text"
          value={newcomer.affiliation}
          onChange={(e) => onUpdate(index, 'affiliation', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
    </div>
  )
})

interface NewcomerSectionProps {
  newcomers: Newcomer[]
  onAdd: () => void
  onUpdate: (index: number, field: keyof Newcomer, value: string) => void
  onRemove: (index: number) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

export default function NewcomerSection({
  newcomers,
  onAdd,
  onUpdate,
  onRemove,
  sectionRef,
}: NewcomerSectionProps) {
  return (
    <div
      ref={sectionRef}
      data-section="newcomer"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-semibold text-gray-900 text-base md:text-lg">새신자 명단</h2>
        <button type="button" onClick={onAdd} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
          + 새신자 추가
        </button>
      </div>

      {newcomers.length > 0 ? (
        <>
          {/* 모바일: 카드 형식 */}
          <div className="md:hidden space-y-3">
            {newcomers.map((newcomer, index) => (
              <NewcomerCardMobile
                key={index}
                newcomer={newcomer}
                index={index}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </div>

          {/* 데스크톱: 테이블 형식 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 text-left font-medium text-gray-600">이름</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">연락처</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">생년월일</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">인도자</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">주소</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">소속(직업)</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {newcomers.map((newcomer, index) => (
                  <NewcomerRowDesktop
                    key={index}
                    newcomer={newcomer}
                    index={index}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">새신자가 없습니다</p>
      )}
    </div>
  )
}
