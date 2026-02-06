import AccountingRecordForm from '@/components/accounting/AccountingRecordForm'
import Link from 'next/link'

export default function NewAccountingRecordPage() {
  return (
    <div className="p-4 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href="/accounting"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          회계 관리로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">회계장부 입력</h1>
        <p className="text-gray-500 text-sm mt-1">수입 또는 지출 내역을 직접 입력합니다</p>
      </div>

      {/* 폼 */}
      <AccountingRecordForm />
    </div>
  )
}
