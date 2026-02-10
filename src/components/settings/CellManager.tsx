'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments, useAllCells, useCreateCell, useUpdateCell, useReorderCells } from '@/queries/departments'
import { isAdmin } from '@/lib/permissions'
import { useToastContext } from '@/providers/ToastProvider'
import type { Cell } from '@/types/database'

export default function CellManager() {
  const { user } = useAuth()
  const toast = useToastContext()
  const { data: departments = [], isLoading: deptsLoading } = useDepartments()

  const [selectedDeptId, setSelectedDeptId] = useState('')
  const { data: cells = [], isLoading: cellsLoading } = useAllCells(selectedDeptId || undefined)

  const createCell = useCreateCell()
  const updateCell = useUpdateCell()
  const reorderCells = useReorderCells()

  const [newCellName, setNewCellName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // 권한 체크
  if (!user || !isAdmin(user.role)) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">접근 권한 없음</h3>
          <p className="text-sm text-yellow-600">관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  const activeCells = cells.filter(c => c.is_active)
  const inactiveCells = cells.filter(c => !c.is_active)

  // 셀 추가
  const handleAddCell = async () => {
    if (!newCellName.trim() || !selectedDeptId) return
    try {
      const maxOrder = cells.length > 0 ? Math.max(...cells.map(c => c.display_order)) : 0
      await createCell.mutateAsync({
        department_id: selectedDeptId,
        name: newCellName.trim(),
        display_order: maxOrder + 1,
      })
      setNewCellName('')
      toast.success(`"${newCellName.trim()}" 셀이 추가되었습니다.`)
    } catch {
      toast.error('셀 추가에 실패했습니다.')
    }
  }

  // 이름 수정 시작
  const startEdit = useCallback((cell: Cell) => {
    setEditingId(cell.id)
    setEditingName(cell.name)
  }, [])

  // 이름 수정 저장
  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return
    try {
      await updateCell.mutateAsync({ id: editingId, name: editingName.trim() })
      setEditingId(null)
      toast.success('셀 이름이 수정되었습니다.')
    } catch {
      toast.error('수정에 실패했습니다.')
    }
  }

  // 활성/비활성 토글
  const toggleActive = async (cell: Cell) => {
    try {
      await updateCell.mutateAsync({ id: cell.id, is_active: !cell.is_active })
      toast.success(cell.is_active ? '셀이 비활성화되었습니다.' : '셀이 활성화되었습니다.')
    } catch {
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  // 순서 변경 (위/아래)
  const moveCell = async (cell: Cell, direction: 'up' | 'down') => {
    const sorted = [...activeCells].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(c => c.id === cell.id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const updates = [
      { id: sorted[idx].id, display_order: sorted[swapIdx].display_order },
      { id: sorted[swapIdx].id, display_order: sorted[idx].display_order },
    ]
    try {
      await reorderCells.mutateAsync(updates)
    } catch {
      toast.error('순서 변경에 실패했습니다.')
    }
  }

  const selectedDept = departments.find(d => d.id === selectedDeptId)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">셀 관리</h1>
        <p className="text-sm text-gray-500 mt-1">부서별 셀을 추가, 수정, 관리합니다.</p>
      </div>

      {/* 부서 선택 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">부서 선택</label>
        <select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="w-full md:w-72 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">부서를 선택하세요</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
          ))}
        </select>
      </div>

      {/* 셀 목록 */}
      {selectedDeptId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {selectedDept?.name} 셀 목록
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({activeCells.length}개 활성)
                </span>
              </h2>
            </div>
          </div>

          {cellsLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
            </div>
          ) : (
            <>
              {/* 활성 셀 목록 */}
              <div className="divide-y divide-gray-50">
                {activeCells
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((cell, idx) => (
                    <div key={cell.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      {/* 순서 번호 */}
                      <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>

                      {/* 이름 */}
                      {editingId === cell.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                            저장
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                            취소
                          </button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => startEdit(cell)}
                          title="클릭하여 이름 수정"
                        >
                          {cell.name}
                        </span>
                      )}

                      {/* 순서 변경 버튼 */}
                      {editingId !== cell.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveCell(cell, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title="위로"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveCell(cell, 'down')}
                            disabled={idx === activeCells.length - 1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title="아래로"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* 비활성화 버튼 */}
                          <button
                            onClick={() => toggleActive(cell)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="비활성화"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {activeCells.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  등록된 셀이 없습니다. 아래에서 추가해주세요.
                </div>
              )}

              {/* 셀 추가 */}
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    value={newCellName}
                    onChange={(e) => setNewCellName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCell(); }}
                    placeholder="새 셀 이름 (예: 7셀)"
                    className="flex-1 md:max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  />
                  <button
                    onClick={handleAddCell}
                    disabled={!newCellName.trim() || createCell.isPending}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createCell.isPending ? '추가 중...' : '추가'}
                  </button>
                </div>
              </div>

              {/* 비활성 셀 */}
              {inactiveCells.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-3 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500">비활성 셀 ({inactiveCells.length}개)</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {inactiveCells.map(cell => (
                      <div key={cell.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50/50">
                        <span className="w-7 h-7 bg-gray-200 text-gray-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                          -
                        </span>
                        <span className="flex-1 text-sm text-gray-400 line-through">{cell.name}</span>
                        <button
                          onClick={() => toggleActive(cell)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          활성화
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 md:p-4">
        <div className="flex gap-2 md:gap-3">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs md:text-sm text-blue-800">
            <p className="font-medium mb-0.5 md:mb-1">셀 관리 안내</p>
            <ul className="text-blue-600 space-y-0.5">
              <li>셀 이름을 클릭하면 수정할 수 있습니다.</li>
              <li>비활성화된 셀은 필터에 표시되지 않지만 데이터는 유지됩니다.</li>
              <li>순서를 변경하면 필터 목록 순서에 반영됩니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
