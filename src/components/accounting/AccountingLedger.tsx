'use client'

import { AccountingRecordWithDetails } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface AccountingLedgerProps {
  records: AccountingRecordWithDetails[]
  onRecordDeleted: () => void
  canEdit: boolean
}

export default function AccountingLedger({ records, onRecordDeleted, canEdit }: AccountingLedgerProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.getDate()
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setDeleting(id)
    const supabase = createClient()

    const { error } = await supabase
      .from('accounting_records')
      .delete()
      .eq('id', id)

    if (error) {
      alert('삭제 중 오류가 발생했습니다.')
      console.error(error)
    } else {
      onRecordDeleted()
    }
    setDeleting(null)
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

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">해당 기간에 회계 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 모바일: 카드 형식 */}
      <div className="md:hidden divide-y divide-gray-100">
        {recordsWithBalance.map((record) => (
          <div key={record.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
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
              <tr key={record.id} className="hover:bg-gray-50">
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
              <td className="px-4 py-3 text-center text-sm text-gray-900" colSpan={2}>
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
