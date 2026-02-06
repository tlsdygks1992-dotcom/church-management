'use client'

import { memo } from 'react'
import type { Program } from './types'
import { TIME_OPTIONS } from './types'

// 데스크톱용 프로그램 행
const ProgramRowDesktop = memo(function ProgramRowDesktop({
  program,
  index,
  onUpdate,
  onRemove,
}: {
  program: Program
  index: number
  onUpdate: (index: number, field: keyof Program, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <select
            value={program.start_time}
            onChange={(e) => onUpdate(index, 'start_time', e.target.value)}
            className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={`start-${index}-${time}`} value={time}>{time}</option>
            ))}
          </select>
          <span className="text-gray-400">~</span>
          <select
            value={program.end_time}
            onChange={(e) => onUpdate(index, 'end_time', e.target.value)}
            className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={`end-${index}-${time}`} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.content}
          onChange={(e) => onUpdate(index, 'content', e.target.value)}
          placeholder="예: 찬양 및 기도"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.person_in_charge}
          onChange={(e) => onUpdate(index, 'person_in_charge', e.target.value)}
          placeholder="담당자"
          className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          placeholder="비고"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
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

// 모바일용 프로그램 카드
const ProgramCardMobile = memo(function ProgramCardMobile({
  program,
  index,
  onUpdate,
  onRemove,
}: {
  program: Program
  index: number
  onUpdate: (index: number, field: keyof Program, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">순서 {index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <select
          value={program.start_time}
          onChange={(e) => onUpdate(index, 'start_time', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={`m-start-${index}-${time}`} value={time}>{time}</option>
          ))}
        </select>
        <span className="text-gray-400 py-1.5">~</span>
        <select
          value={program.end_time}
          onChange={(e) => onUpdate(index, 'end_time', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={`m-end-${index}-${time}`} value={time}>{time}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={program.content}
        onChange={(e) => onUpdate(index, 'content', e.target.value)}
        placeholder="내용 (예: 찬양 및 기도)"
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={program.person_in_charge}
          onChange={(e) => onUpdate(index, 'person_in_charge', e.target.value)}
          placeholder="담당자"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
        <input
          type="text"
          value={program.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          placeholder="비고"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
    </div>
  )
})

interface ProgramTableProps {
  programs: Program[]
  onAdd: () => void
  onUpdate: (index: number, field: keyof Program, value: string | number) => void
  onRemove: (index: number) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

export default function ProgramTable({
  programs,
  onAdd,
  onUpdate,
  onRemove,
  sectionRef,
}: ProgramTableProps) {
  return (
    <div
      ref={sectionRef}
      data-section="program"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-semibold text-gray-900 text-base md:text-lg">진행순서</h2>
        <button type="button" onClick={onAdd} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
          + 항목 추가
        </button>
      </div>

      {/* 모바일: 카드 형식 */}
      <div className="md:hidden space-y-3">
        {programs.map((program, index) => (
          <ProgramCardMobile
            key={index}
            program={program}
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
              <th className="px-2 py-2 text-left font-medium text-gray-600">시간</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">내용</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">담당</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">비고</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.map((program, index) => (
              <ProgramRowDesktop
                key={index}
                program={program}
                index={index}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
