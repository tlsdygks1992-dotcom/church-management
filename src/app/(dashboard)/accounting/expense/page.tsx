import ExpenseRequestList from '@/components/accounting/ExpenseRequestList'
import Link from 'next/link'

export default function ExpenseListPage() {
  return (
    <div className="p-4 lg:p-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/accounting"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            회계 관리로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">지출결의서 목록</h1>
          <p className="text-gray-500 text-sm mt-1">작성된 지출결의서를 조회합니다</p>
        </div>
        <Link
          href="/accounting/expense/new"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center"
        >
          지출결의서 작성
        </Link>
      </div>

      {/* 목록 */}
      <ExpenseRequestList />
    </div>
  )
}
