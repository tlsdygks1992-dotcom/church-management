import EditReportClient from '@/components/reports/EditReportClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditReportPage({ params }: Props) {
  const { id } = await params
  return <EditReportClient reportId={id} />
}
