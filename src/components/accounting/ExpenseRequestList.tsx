'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExpenseRequestWithItems, Department, canAccessAllDepartments } from '@/types/database'
import Link from 'next/link'
import { useToastContext } from '@/providers/ToastProvider'

export default function ExpenseRequestList() {
  const toast = useToastContext()
  const [requests, setRequests] = useState<ExpenseRequestWithItems[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [canAccessAll, setCanAccessAll] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchUserAndDepartments()
  }, [])

  useEffect(() => {
    if (selectedDeptId) {
      fetchRequests()
    }
  }, [selectedDeptId, selectedYear, selectedMonth])

  async function fetchUserAndDepartments() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 사용자 정보와 부서 목록 병렬 조회
    const [userResult, deptResult] = await Promise.all([
      supabase
        .from('users')
        .select('role, user_departments(department_id)')
        .eq('id', user.id)
        .single(),
      supabase
        .from('departments')
        .select('*')
        .order('name')
    ])

    const userData = userResult.data
    const deptData = deptResult.data

    if (deptData && userData) {
      const hasFullAccess = canAccessAllDepartments(userData.role)
      setCanAccessAll(hasFullAccess)

      if (hasFullAccess) {
        setDepartments(deptData)
        setSelectedDeptId(deptData[0]?.id || '')
      } else {
        // 비관리자: 소속 부서만 표시
        const userDeptIds = userData.user_departments?.map((ud: { department_id: string }) => ud.department_id) || []
        const filtered = deptData.filter((d: Department) => userDeptIds.includes(d.id))
        setDepartments(filtered)
        setSelectedDeptId(filtered[0]?.id || '')
      }
    }
    setLoading(false)
  }

  async function fetchRequests() {
    const supabase = createClient()

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('expense_requests')
      .select(`
        *,
        departments:department_id(name),
        users:requester_id(name),
        expense_items(*)
      `)
      .eq('department_id', selectedDeptId)
      .gte('request_date', startDate)
      .lte('request_date', endDate)
      .order('request_date', { ascending: false })

    if (error) {
      console.error('지출결의서 조회 오류:', error)
    } else {
      setRequests(data || [])
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까? 연결된 회계장부 내역도 함께 삭제됩니다.')) return

    setDeleting(id)
    const supabase = createClient()

    // 연결된 회계장부 삭제
    await supabase
      .from('accounting_records')
      .delete()
      .eq('expense_request_id', id)

    // 지출결의서 삭제 (cascade로 항목도 삭제)
    const { error } = await supabase
      .from('expense_requests')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('삭제 중 오류가 발생했습니다.')
      console.error(error)
    } else {
      fetchRequests()
    }
    setDeleting(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 목록 */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">해당 기간에 지출결의서가 없습니다.</p>
          <Link
            href="/accounting/expense/new"
            className="inline-block mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            지출결의서 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatDate(request.request_date)}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-sm">
                    {(request.departments as { name: string } | undefined)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-600">
                    {formatAmount(request.total_amount)}원
                  </span>
                  {canAccessAll && (
                    <button
                      onClick={() => handleDelete(request.id)}
                      disabled={deleting === request.id}
                      className="ml-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      {deleting === request.id ? '...' : '삭제'}
                    </button>
                  )}
                </div>
              </div>

              {/* 항목 요약 */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {request.expense_items.slice(0, 4).map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{item.description}</span>
                      <span className="text-gray-900 font-medium ml-2">{formatAmount(item.amount)}원</span>
                    </div>
                  ))}
                  {request.expense_items.length > 4 && (
                    <div className="text-sm text-gray-500">
                      외 {request.expense_items.length - 4}건
                    </div>
                  )}
                </div>
              </div>

              {/* 수령인 및 비고 */}
              {(request.recipient_name || request.notes) && (
                <div className="border-t border-gray-100 pt-3 mt-3 text-sm text-gray-500">
                  {request.recipient_name && (
                    <span>수령인: {request.recipient_name}</span>
                  )}
                  {request.recipient_name && request.notes && (
                    <span className="mx-2">·</span>
                  )}
                  {request.notes && (
                    <span>{request.notes}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
