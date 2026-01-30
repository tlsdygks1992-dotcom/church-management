import * as XLSX from 'xlsx'

interface ExportOptions {
  filename: string
  sheetName?: string
}

export function exportToExcel<T>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: ExportOptions
) {
  // 헤더와 데이터 준비
  const headers = columns.map(col => col.header)
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key]
      // null/undefined 처리
      if (value === null || value === undefined) return ''
      // 날짜 처리
      if (value instanceof Date) return value.toLocaleDateString('ko-KR')
      return String(value)
    })
  )

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // 열 너비 자동 조정
  const colWidths = columns.map((col, i) => {
    const maxLength = Math.max(
      col.header.length,
      ...rows.map(row => String(row[i] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1')

  // 파일 다운로드
  XLSX.writeFile(workbook, `${options.filename}.xlsx`)
}

// 교인 명단 내보내기
export interface MemberExportData {
  name: string
  phone: string | null
  birthDate?: string
  department: string
  isActive: string
  joinedAt: string
}

export function exportMembersToExcel(members: MemberExportData[], filename?: string) {
  exportToExcel(
    members,
    [
      { key: 'name', header: '이름' },
      { key: 'phone', header: '연락처' },
      { key: 'birthDate', header: '생년월일' },
      { key: 'department', header: '부서' },
      { key: 'isActive', header: '활동상태' },
      { key: 'joinedAt', header: '등록일' },
    ],
    { filename: filename || `교인명단_${new Date().toISOString().split('T')[0]}`, sheetName: '교인명단' }
  )
}

// 출결 기록 내보내기
export interface AttendanceExportData {
  name: string
  date: string
  worship: string
  meeting: string
}

export function exportAttendanceToExcel(
  records: AttendanceExportData[],
  departmentName: string,
  date: string
) {
  exportToExcel(
    records,
    [
      { key: 'name', header: '이름' },
      { key: 'date', header: '날짜' },
      { key: 'worship', header: '예배' },
      { key: 'meeting', header: '모임' },
    ],
    {
      filename: `출결기록_${departmentName}_${date}`,
      sheetName: '출결기록'
    }
  )
}

// 통계 내보내기
export interface StatsExportData {
  department: string
  totalMembers: number
  worshipCount: number
  worshipRate: number
  meetingCount: number
  meetingRate: number
}

export function exportStatsToExcel(
  stats: StatsExportData[],
  period: string
) {
  exportToExcel(
    stats,
    [
      { key: 'department', header: '부서' },
      { key: 'totalMembers', header: '재적인원' },
      { key: 'worshipCount', header: '예배출석(회)' },
      { key: 'worshipRate', header: '예배출석률(%)' },
      { key: 'meetingCount', header: '모임출석(회)' },
      { key: 'meetingRate', header: '모임출석률(%)' },
    ],
    {
      filename: `출석통계_${period}_${new Date().toISOString().split('T')[0]}`,
      sheetName: '출석통계'
    }
  )
}
