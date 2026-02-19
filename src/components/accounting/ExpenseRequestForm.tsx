'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toLocalDateString } from '@/lib/utils'
import { canAccessAllDepartments, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/database'
import { useToastContext } from '@/providers/ToastProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'

interface ExpenseItemInput {
  id: string
  item_date: string
  description: string
  category: ExpenseCategory | ''
  amount: number
  notes: string
}

export default function ExpenseRequestForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToastContext()
  const { user } = useAuth()
  const { data: allDepts = [] } = useDepartments()
  const [loading, setLoading] = useState(false)

  const isAllAccess = canAccessAllDepartments(user?.role || '')
  const departments = useMemo(() => {
    if (isAllAccess) return allDepts
    return allDepts.filter(d =>
      user?.user_departments?.some(ud => ud.departments?.id === d.id)
    )
  }, [isAllAccess, allDepts, user])

  const [formData, setFormData] = useState({
    department_id: '',
    request_date: toLocalDateString(new Date()),
    recipient_name: '',
    notes: ''
  })

  const [items, setItems] = useState<ExpenseItemInput[]>([
    { id: '1', item_date: toLocalDateString(new Date()), description: '', category: '', amount: 0, notes: '' }
  ])

  const [addToLedger, setAddToLedger] = useState(true)

  // 부서 목록 로드 시 기본값 설정
  useEffect(() => {
    if (departments.length > 0 && !formData.department_id) {
      setFormData(prev => ({ ...prev, department_id: departments[0].id }))
    }
  }, [departments])

  function addItem() {
    setItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        item_date: toLocalDateString(new Date()),
        description: '',
        category: '',
        amount: 0,
        notes: ''
      }
    ])
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      toast.warning('최소 1개의 항목이 필요합니다.')
      return
    }
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function updateItem(id: string, field: keyof ExpenseItemInput, value: string | number) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.department_id) {
      toast.warning('부서를 선택해주세요.')
      return
    }

    const validItems = items.filter(item => item.description && item.category && item.amount > 0)
    if (validItems.length === 0) {
      toast.warning('최소 1개의 유효한 항목을 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // 1. 지출결의서 생성
    const { data: expenseRequest, error: requestError } = await supabase
      .from('expense_requests')
      .insert({
        department_id: formData.department_id,
        requester_id: user?.id,
        request_date: formData.request_date,
        total_amount: totalAmount,
        recipient_name: formData.recipient_name,
        notes: formData.notes
      })
      .select()
      .single()

    if (requestError) {
      console.error('지출결의서 저장 오류:', requestError)
      toast.error('저장 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    // 2. 지출결의서 항목 저장
    const expenseItems = validItems.map((item, index) => ({
      expense_request_id: expenseRequest.id,
      item_date: item.item_date,
      description: item.description,
      category: item.category,
      amount: item.amount,
      notes: item.notes,
      order_index: index
    }))

    const { error: itemsError } = await supabase
      .from('expense_items')
      .insert(expenseItems)

    if (itemsError) {
      console.error('지출결의서 항목 저장 오류:', itemsError)
      toast.error('지출 항목 저장 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    // 3. 회계장부에 반영 (옵션)
    if (addToLedger) {
      // 현재 잔액 계산
      const { data: prevRecords } = await supabase
        .from('accounting_records')
        .select('income_amount, expense_amount')
        .eq('department_id', formData.department_id)
        .lte('record_date', formData.request_date)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      let currentBalance = 0
      if (prevRecords) {
        currentBalance = prevRecords.reduce((sum: number, r: { income_amount: number; expense_amount: number }) => sum + (r.income_amount || 0) - (r.expense_amount || 0), 0)
      }

      // 각 항목별로 회계장부에 추가
      for (const item of validItems) {
        currentBalance -= item.amount

        const { error: ledgerError } = await supabase
          .from('accounting_records')
          .insert({
            department_id: formData.department_id,
            record_date: item.item_date,
            description: item.description,
            income_amount: 0,
            expense_amount: item.amount,
            balance: currentBalance,
            category: item.category,
            notes: item.notes,
            expense_request_id: expenseRequest.id,
            created_by: user?.id
          })

        if (ledgerError) {
          console.error('회계장부 반영 오류:', ledgerError)
          toast.error('회계장부 반영 중 오류가 발생했습니다.')
          setLoading(false)
          return
        }
      }
    }

    toast.success('지출결의서가 저장되었습니다.')
    await queryClient.invalidateQueries({ queryKey: ['expense-requests'] })
    await queryClient.invalidateQueries({ queryKey: ['accounting'] })
    router.push('/accounting/expense')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">청구부서 *</label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">청구일자 *</label>
            <input
              type="date"
              value={formData.request_date}
              onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수령인</label>
            <input
              type="text"
              value={formData.recipient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
              placeholder="수령인 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 지출 항목 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">지출 항목</h2>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            + 항목 추가
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">항목 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">날짜</label>
                  <input
                    type="date"
                    value={item.item_date}
                    onChange={(e) => updateItem(item.id, 'item_date', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">내용 *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="지출 내용"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">구분 *</label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(item.id, 'category', e.target.value as ExpenseCategory)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">금액 *</label>
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) => updateItem(item.id, 'amount', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">비고</label>
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                  placeholder="메모"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* 총합 */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">총 합계</span>
          <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString('ko-KR')}원</span>
        </div>
      </div>

      {/* 비고 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="추가 메모사항"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={addToLedger}
              onChange={(e) => setAddToLedger(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">회계장부에 자동 반영</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            체크하면 저장 시 각 항목이 회계장부에 지출로 자동 등록됩니다.
          </p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? '저장 중...' : '지출결의서 저장'}
        </button>
      </div>
    </form>
  )
}
