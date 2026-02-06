'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Department, canAccessAllDepartments, INCOME_CATEGORIES, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/database'
import { useToastContext } from '@/providers/ToastProvider'

export default function AccountingRecordForm() {
  const toast = useToastContext()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [userDeptId, setUserDeptId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const [formData, setFormData] = useState({
    department_id: '',
    record_date: new Date().toISOString().split('T')[0],
    description: '',
    income_amount: 0,
    expense_amount: 0,
    category: '' as ExpenseCategory | '',
    notes: ''
  })

  const [recordType, setRecordType] = useState<'income' | 'expense'>('income')

  useEffect(() => {
    fetchUserAndDepartments()
  }, [])

  async function fetchUserAndDepartments() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const { data: userData } = await supabase
      .from('users')
      .select('role, department_id')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      setUserDeptId(userData.department_id || '')
    }

    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (deptData) {
      if (canAccessAllDepartments(userData?.role || '')) {
        setDepartments(deptData)
        setFormData(prev => ({ ...prev, department_id: deptData[0]?.id || '' }))
      } else {
        const filtered = deptData.filter((d: Department) => d.id === userData?.department_id)
        setDepartments(filtered)
        setFormData(prev => ({ ...prev, department_id: userData?.department_id || '' }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.department_id || !formData.description || !formData.category) {
      toast.warning('필수 항목을 모두 입력해주세요.')
      return
    }

    const amount = recordType === 'income' ? formData.income_amount : formData.expense_amount
    if (amount <= 0) {
      toast.warning('금액을 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // 현재 잔액 계산
    const { data: prevRecords } = await supabase
      .from('accounting_records')
      .select('income_amount, expense_amount')
      .eq('department_id', formData.department_id)
      .lte('record_date', formData.record_date)
      .order('record_date', { ascending: true })
      .order('created_at', { ascending: true })

    let currentBalance = 0
    if (prevRecords) {
      currentBalance = prevRecords.reduce((sum: number, r: { income_amount: number; expense_amount: number }) => sum + (r.income_amount || 0) - (r.expense_amount || 0), 0)
    }

    const newBalance = recordType === 'income'
      ? currentBalance + formData.income_amount
      : currentBalance - formData.expense_amount

    const { error } = await supabase
      .from('accounting_records')
      .insert({
        department_id: formData.department_id,
        record_date: formData.record_date,
        description: formData.description,
        income_amount: recordType === 'income' ? formData.income_amount : 0,
        expense_amount: recordType === 'expense' ? formData.expense_amount : 0,
        balance: newBalance,
        category: formData.category,
        notes: formData.notes,
        created_by: userId
      })

    if (error) {
      console.error('저장 오류:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } else {
      router.push('/accounting')
    }
    setLoading(false)
  }

  const categories = recordType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="space-y-6">
        {/* 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={recordType === 'income'}
                onChange={() => {
                  setRecordType('income')
                  setFormData(prev => ({ ...prev, category: '', income_amount: 0, expense_amount: 0 }))
                }}
                className="text-blue-600"
              />
              <span className="text-sm text-blue-600 font-medium">수입</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={recordType === 'expense'}
                onChange={() => {
                  setRecordType('expense')
                  setFormData(prev => ({ ...prev, category: '', income_amount: 0, expense_amount: 0 }))
                }}
                className="text-red-600"
              />
              <span className="text-sm text-red-600 font-medium">지출</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 부서 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서 *</label>
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

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
            <input
              type="date"
              value={formData.record_date}
              onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* 적요 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">적요 *</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="예: 1월 운영비"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {recordType === 'income' ? '수입금액' : '지출금액'} *
            </label>
            <div className="relative">
              <input
                type="number"
                value={recordType === 'income' ? formData.income_amount : formData.expense_amount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0
                  if (recordType === 'income') {
                    setFormData(prev => ({ ...prev, income_amount: value }))
                  } else {
                    setFormData(prev => ({ ...prev, expense_amount: value }))
                  }
                }}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
            </div>
          </div>

          {/* 구분 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구분 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="추가 메모"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 mt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
