'use client'

import { AccountingRecordWithDetails } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface AccountingSummaryProps {
  records: AccountingRecordWithDetails[]
  year: number
  month: number
  departmentId: string
}

export default function AccountingSummary({ records, year, month, departmentId }: AccountingSummaryProps) {
  const [previousBalance, setPreviousBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreviousBalance()
  }, [year, month, departmentId])

  async function fetchPreviousBalance() {
    if (!departmentId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // 이전 달의 마지막 잔액 계산
    const endOfPrevMonth = new Date(year, month - 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('accounting_records')
      .select('income_amount, expense_amount')
      .eq('department_id', departmentId)
      .lte('record_date', endOfPrevMonth)
      .order('record_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('이월금 조회 오류:', error)
    } else if (data) {
      const balance = data.reduce((sum: number, r: { income_amount: number; expense_amount: number }) => sum + (r.income_amount || 0) - (r.expense_amount || 0), 0)
      setPreviousBalance(balance)
    }
    setLoading(false)
  }

  const totalIncome = records.reduce((sum, r) => sum + (r.income_amount || 0), 0)
  const totalExpense = records.reduce((sum, r) => sum + (r.expense_amount || 0), 0)
  const currentBalance = previousBalance + totalIncome - totalExpense

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">전월 이월금</p>
        <p className="text-xl font-bold text-gray-900">{formatAmount(previousBalance)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">{month}월 수입</p>
        <p className="text-xl font-bold text-blue-600">+{formatAmount(totalIncome)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">{month}월 지출</p>
        <p className="text-xl font-bold text-red-600">-{formatAmount(totalExpense)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">현재 잔액</p>
        <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatAmount(currentBalance)}원
        </p>
      </div>
    </div>
  )
}
