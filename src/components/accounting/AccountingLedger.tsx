'use client'

import { AccountingRecordWithDetails } from '@/types/database'
import { useState, useCallback } from 'react'
import { useDeleteAccountingRecords } from '@/queries/accounting'
import { useToastContext } from '@/providers/ToastProvider'

interface AccountingLedgerProps {
  records: AccountingRecordWithDetails[]
  onRecordDeleted: () => void
  canEdit: boolean
}

export default function AccountingLedger({ records, onRecordDeleted, canEdit }: AccountingLedgerProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deleteRecordsMutation = useDeleteAccountingRecords()
  const toast = useToastContext()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.getDate()
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  // 개별 선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // 전체 선택/해제
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map(r => r.id)))
    }
  }, [records, selectedIds.size])

  // 개별 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setDeleting(id)
    deleteRecordsMutation.mutate([id], {
      onSuccess: () => {
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        onRecordDeleted()
        setDeleting(null)
      },
      onError: (error) => {
        toast.error('삭제 중 오류가 발생했습니다.')
        console.error(error)
        setDeleting(null)
      },
    })
  }

  // 선택 항목 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) return

    deleteRecordsMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set())
        onRecordDeleted()
      },
      onError: (error) => {
        toast.error('삭제 중 오류가 발생했습니다.')
        console.error(error)
      },
    })
  }

  // 잔액 계산 (누적)
  let runningBalance = 0
  const recordsWithBalance = records.map((record) => {
    runningBalance += record.income_amount - record.expense_amount
    return { ...record, calculatedBalance: runningBalance }
  })

  // 합계 계산
  const totalIncome = records.reduce((sum, r) => sum + (r.income_amount || 0), 0)
  const totalExpense = records.reduce((sum, r) => sum + (r.expense_amount || 0), 0)

  const isAllSelected = records.length > 0 && selectedIds.size === records.length
  const isSomeSelected = selectedIds.size > 0

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">해당 기간에 회계 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 선택 항목 삭제 바 */}
      {canEdit && isSomeSelected && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <span className="text-sm text-red-700">
            {selectedIds.size}개 항목 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleteRecordsMutation.isPending}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleteRecordsMutation.isPending ? '삭제 중...' : '선택 삭제'}
          </button>
        </div>
      )}

      {/* 모바일: 카드 형식 */}
      <div className="md:hidden divide-y divide-gray-100">
        {/* 모바일 전체 선택 */}
        {canEdit && (
          <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">전체 선택</span>
          </div>
        )}
        {recordsWithBalance.map((record) => (
          <div key={record.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              {canEdit && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => toggleSelect(record.id)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(record.record_date)}일</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{record.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{record.category}</span>
                  {record.notes && (
                    <span className="text-xs text-gray-400 truncate">{record.notes}</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(record.id)}
                  disabled={deleting === record.id}
                  className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50 shrink-0"
                >
                  {deleting === record.id ? '...' : '삭제'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <span className="text-gray-500">수입</span>
                <p className={`font-medium ${record.income_amount > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                  {record.income_amount > 0 ? formatAmount(record.income_amount) : '-'}
                </p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">지출</span>
                <p className={`font-medium ${record.expense_amount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                  {record.expense_amount > 0 ? formatAmount(record.expense_amount) : '-'}
                </p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">잔액</span>
                <p className="font-medium text-gray-900">{formatAmount(record.calculatedBalance)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* 모바일 합계 */}
        <div className="p-3 bg-gray-50">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <span className="text-gray-500 text-xs">총 수입</span>
              <p className="font-semibold text-blue-600">{formatAmount(totalIncome)}</p>
            </div>
            <div className="text-center">
              <span className="text-gray-500 text-xs">총 지출</span>
              <p className="font-semibold text-red-600">{formatAmount(totalExpense)}</p>
            </div>
            <div className="text-center">
              <span className="text-gray-500 text-xs">최종 잔액</span>
              <p className="font-semibold text-gray-900">{formatAmount(totalIncome - totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱: 기존 테이블 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {canEdit && (
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                적요
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                수입금액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                지출금액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                잔액
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                구분
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                비고
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  작업
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recordsWithBalance.map((record) => (
              <tr
                key={record.id}
                className={`hover:bg-gray-50 ${selectedIds.has(record.id) ? 'bg-blue-50' : ''}`}
              >
                {canEdit && (
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-center text-sm text-gray-900">
                  {formatDate(record.record_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {record.description}
                </td>
                <td className="px-4 py-3 text-right text-sm text-blue-600 font-medium">
                  {record.income_amount > 0 ? formatAmount(record.income_amount) : ''}
                </td>
                <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                  {record.expense_amount > 0 ? formatAmount(record.expense_amount) : ''}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">
                  {formatAmount(record.calculatedBalance)}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {record.category}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {record.notes || ''}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={deleting === record.id}
                      className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                    >
                      {deleting === record.id ? '...' : '삭제'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {/* 합계 행 */}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-4 py-3 text-center text-sm text-gray-900" colSpan={canEdit ? 3 : 2}>
                합계
              </td>
              <td className="px-4 py-3 text-right text-sm text-blue-600">
                {formatAmount(totalIncome)}
              </td>
              <td className="px-4 py-3 text-right text-sm text-red-600">
                {formatAmount(totalExpense)}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">
                {formatAmount(totalIncome - totalExpense)}
              </td>
              <td colSpan={canEdit ? 3 : 2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
