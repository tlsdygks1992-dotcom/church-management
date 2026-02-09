'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const CHART_COLORS = [
  '#6b7280', // gray (draft)
  '#f59e0b', // amber (submitted)
  '#3b82f6', // blue (coordinator_reviewed)
  '#8b5cf6', // violet (manager_approved)
  '#22c55e', // green (final_approved)
  '#ef4444', // red (rejected)
]

const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  coordinator_reviewed: '회장 협조',
  manager_approved: '부장 결재',
  final_approved: '완료',
  rejected: '반려',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  submitted: '#f59e0b',
  coordinator_reviewed: '#3b82f6',
  manager_approved: '#8b5cf6',
  final_approved: '#22c55e',
  rejected: '#ef4444',
}

// 결재 상태 분포 파이 차트
export interface StatusDistribution {
  status: string
  label: string
  count: number
  color: string
}

interface StatusDistributionChartProps {
  data: StatusDistribution[]
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const filtered = data.filter(d => d.count > 0)

  if (filtered.length === 0) {
    return (
      <div className="text-center py-6 md:py-8 text-sm text-gray-500">
        해당 기간의 보고서 데이터가 없습니다.
      </div>
    )
  }

  const total = filtered.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <div className="h-64 w-full md:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
            >
              {filtered.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}건`, '보고서']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* 범례 */}
      <div className="flex flex-wrap md:flex-col gap-2 md:gap-3 md:w-1/2">
        {filtered.map((item) => (
          <div key={item.status} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900">{item.count}건</span>
            <span className="text-gray-400">({total > 0 ? Math.round((item.count / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 기간별 제출 추이 라인 차트
export interface WeeklyReportTrend {
  week: string
  submitted: number
  approved: number
  rejected: number
}

interface ReportTrendChartProps {
  data: WeeklyReportTrend[]
}

export function ReportTrendChart({ data }: ReportTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 md:py-8 text-sm text-gray-500">
        해당 기간의 보고서 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                submitted: '제출',
                approved: '승인',
                rejected: '반려',
              }
              return [`${value}건`, labels[name as string] || name]
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => {
              const labels: Record<string, string> = {
                submitted: '제출',
                approved: '승인',
                rejected: '반려',
              }
              return labels[value] || value
            }}
          />
          <Line
            type="monotone"
            dataKey="submitted"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="approved"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="rejected"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 부서별 제출률 비교 가로 바 차트
export interface DeptReportStats {
  department: string
  code: string
  totalExpected: number
  submittedCount: number
  approvedCount: number
  submissionRate: number
  approvalRate: number
}

interface DeptSubmissionChartProps {
  data: DeptReportStats[]
}

export function DeptSubmissionChart({ data }: DeptSubmissionChartProps) {
  if (data.length === 0) return null

  return (
    <div className="h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal vertical={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="department"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            width={50}
          />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                submissionRate: '제출률',
                approvalRate: '승인률',
              }
              return [`${value}%`, labels[name as string] || name]
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                submissionRate: '제출률',
                approvalRate: '승인률',
              }
              return labels[value] || value
            }}
          />
          <Bar dataKey="submissionRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          <Bar dataKey="approvalRate" fill="#22c55e" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 결재 소요 시간 바 차트
export interface ApprovalDuration {
  department: string
  avgHours: number
  minHours: number
  maxHours: number
}

interface ApprovalDurationChartProps {
  data: ApprovalDuration[]
}

export function ApprovalDurationChart({ data }: ApprovalDurationChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 md:py-8 text-sm text-gray-500">
        결재 완료된 보고서가 없습니다.
      </div>
    )
  }

  // 시간을 일 단위로 변환해서 표시
  const displayData = data.map(d => ({
    ...d,
    avgDays: Math.round(d.avgHours / 24 * 10) / 10,
    minDays: Math.round(d.minHours / 24 * 10) / 10,
    maxDays: Math.round(d.maxHours / 24 * 10) / 10,
  }))

  return (
    <div className="h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={displayData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: '일', position: 'insideTopLeft', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
          />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                avgDays: '평균',
                minDays: '최소',
                maxDays: '최대',
              }
              return [`${value}일`, labels[name as string] || name]
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                avgDays: '평균',
                minDays: '최소',
                maxDays: '최대',
              }
              return labels[value] || value
            }}
          />
          <Bar dataKey="minDays" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avgDays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="maxDays" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export { STATUS_LABELS, STATUS_COLORS, CHART_COLORS }
