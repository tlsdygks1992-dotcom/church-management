'use client'

import { memo } from 'react'
import type { CellAttendance } from './types'

// 셀 출결 행 컴포넌트
const CellAttendanceRow = memo(function CellAttendanceRow({
  cell,
  index,
  onUpdate,
  onRemove,
}: {
  cell: CellAttendance
  index: number
  onUpdate: (index: number, field: keyof CellAttendance, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-3 py-2">
        <input
          type="text"
          value={cell.cell_name}
          onChange={(e) => onUpdate(index, 'cell_name', e.target.value)}
          placeholder="셀 이름"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.registered || ''}
          onChange={(e) => onUpdate(index, 'registered', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.worship || ''}
          onChange={(e) => onUpdate(index, 'worship', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.meeting || ''}
          onChange={(e) => onUpdate(index, 'meeting', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={cell.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

interface AttendanceInputProps {
  cellAttendance: CellAttendance[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  onAdd: () => void
  onUpdate: (index: number, field: keyof CellAttendance, value: string | number) => void
  onRemove: (index: number) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

export default function AttendanceInput({
  cellAttendance,
  attendanceSummary,
  onAdd,
  onUpdate,
  onRemove,
  sectionRef,
}: AttendanceInputProps) {
  return (
    <div
      ref={sectionRef}
      data-section="attendance"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-semibold text-gray-900 text-base md:text-lg">출결상황</h2>
        <button type="button" onClick={onAdd} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
          + 셀 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-600">구분(셀)</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">재적</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" colSpan={2}>출석</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">참고사항</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
            <tr className="bg-gray-50">
              <th></th>
              <th></th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">예배</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">CU</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cellAttendance.map((cell, index) => (
              <CellAttendanceRow
                key={index}
                cell={cell}
                index={index}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
            {/* 합계 */}
            <tr className="bg-blue-50 font-medium">
              <td className="px-3 py-2 text-gray-700">합계</td>
              <td className="px-3 py-2 text-center text-gray-900">
                {cellAttendance.reduce((sum, c) => sum + c.registered, 0) || attendanceSummary.total}
              </td>
              <td className="px-3 py-2 text-center text-blue-700">
                {cellAttendance.reduce((sum, c) => sum + c.worship, 0) || attendanceSummary.worship}
              </td>
              <td className="px-3 py-2 text-center text-green-700">
                {cellAttendance.reduce((sum, c) => sum + c.meeting, 0) || attendanceSummary.meeting}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
