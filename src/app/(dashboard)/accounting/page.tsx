'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AccountingRecordWithDetails, Department, canAccessAllDepartments } from '@/types/database'
import AccountingLedger from '@/components/accounting/AccountingLedger'
import AccountingSummary from '@/components/accounting/AccountingSummary'
import AccountingImport from '@/components/accounting/AccountingImport'
import { exportAccountingToExcel, AccountingImportRow } from '@/lib/excel'
import Link from 'next/link'

export default function AccountingPage() {
  const [records, setRecords] = useState<AccountingRecordWithDetails[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userDeptId, setUserDeptId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchUserAndDepartments()
  }, [])

  useEffect(() => {
    if (selectedDeptId) {
      fetchRecords()
    }
  }, [selectedDeptId, selectedYear, selectedMonth])

  async function fetchUserAndDepartments() {
    const supabase = createClient()

    // 현재 사용자 정보 가져오기
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

    // 부서 목록 가져오기
    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (deptData) {
      // 권한에 따라 부서 필터링
      if (canAccessAllDepartments(userData?.role || '')) {
        setDepartments(deptData)
        setSelectedDeptId(deptData[0]?.id || '')
      } else {
        // team_leader는 자기 부서만
        const filtered = deptData.filter((d: Department) => d.id === userData?.department_id)
        setDepartments(filtered)
        setSelectedDeptId(userData?.department_id || '')
      }
    }
    setLoading(false)
  }

  async function fetchRecords() {
    const supabase = createClient()

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('accounting_records')
      .select(`
        *,
        departments:department_id(name),
        users:created_by(name)
      `)
      .eq('department_id', selectedDeptId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('회계장부 조회 오류:', error)
    } else {
      setRecords(data || [])
    }
  }

  const handleRecordDeleted = () => {
    fetchRecords()
  }

  // 엑셀 내보내기
  const handleExport = useCallback(async () => {
    const selectedDept = departments.find(d => d.id === selectedDeptId)
    const exportData = records.map(r => ({
      day: new Date(r.record_date).getDate(),
      description: r.description,
      incomeAmount: r.income_amount > 0 ? r.income_amount.toLocaleString('ko-KR') : '',
      expenseAmount: r.expense_amount > 0 ? r.expense_amount.toLocaleString('ko-KR') : '',
      balance: r.balance.toLocaleString('ko-KR'),
      category: r.category,
      notes: r.notes || ''
    }))

    await exportAccountingToExcel(
      exportData,
      selectedDept?.name || '회계',
      selectedYear,
      selectedMonth
    )
  }, [records, departments, selectedDeptId, selectedYear, selectedMonth])

  // 엑셀 가져오기
  const handleImport = useCallback(async (data: AccountingImportRow[]) => {
    if (!selectedDeptId || !userId) return

    setImporting(true)
    const supabase = createClient()

    try {
      // 현재 월의 이전 잔액 조회
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
      const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

      const { data: prevRecords } = await supabase
        .from('accounting_records')
        .select('income_amount, expense_amount')
        .eq('department_id', selectedDeptId)
        .lte('record_date', prevEndDate)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      let currentBalance = 0
      if (prevRecords) {
        currentBalance = prevRecords.reduce((sum: number, r: { income_amount: number; expense_amount: number }) => sum + (r.income_amount || 0) - (r.expense_amount || 0), 0)
      }

      // 일자순 정렬
      const sortedData = [...data].sort((a, b) => a.day - b.day)

      // 각 항목 저장
      for (const row of sortedData) {
        const recordDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`

        currentBalance += row.incomeAmount - row.expenseAmount

        await supabase.from('accounting_records').insert({
          department_id: selectedDeptId,
          record_date: recordDate,
          description: row.description,
          income_amount: row.incomeAmount,
          expense_amount: row.expenseAmount,
          balance: currentBalance,
          category: row.category,
          notes: row.notes || null,
          created_by: userId
        })
      }

      // 성공 시 새로고침
      await fetchRecords()
      setShowImportModal(false)
      alert(`${data.length}건의 데이터를 가져왔습니다.`)
    } catch (error) {
      console.error('가져오기 오류:', error)
      alert('데이터 가져오기 중 오류가 발생했습니다.')
    }

    setImporting(false)
  }, [selectedDeptId, selectedYear, selectedMonth, userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const canEdit = canAccessAllDepartments(userRole)

  return (
    <div className="p-4 lg:p-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회계 관리</h1>
          <p className="text-gray-500 text-sm mt-1">회계장부 및 지출결의서 관리</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* 엑셀 가져오기/내보내기 */}
          {canEdit && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              가져오기
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            내보내기
          </button>
          <Link
            href="/accounting/expense"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            지출결의서 목록
          </Link>
          <Link
            href="/accounting/expense/new"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            지출결의서 작성
          </Link>
          <Link
            href="/accounting/ledger/new"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            장부 입력
          </Link>
        </div>
      </div>

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

      {/* 월별 요약 */}
      <AccountingSummary
        records={records}
        year={selectedYear}
        month={selectedMonth}
        departmentId={selectedDeptId}
      />

      {/* 회계장부 테이블 */}
      <div className="mt-6">
        <AccountingLedger
          records={records}
          onRecordDeleted={handleRecordDeleted}
          canEdit={canEdit}
        />
      </div>

      {/* 가져오기 모달 */}
      {showImportModal && (
        <AccountingImport
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  )
}
