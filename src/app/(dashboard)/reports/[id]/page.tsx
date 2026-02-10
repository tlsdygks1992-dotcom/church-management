'use client'

import { useParams } from 'next/navigation'
import ReportDetail from '@/components/reports/ReportDetail'

export default function ReportDetailPage() {
  const params = useParams()
  return <ReportDetail reportId={params.id as string} />
}
