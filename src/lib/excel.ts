import { toLocalDateString } from '@/lib/utils'

// XLSX 동적 임포트 (번들 크기 최적화)
async function loadXLSX() {
  const XLSX = await import('xlsx')
  return XLSX
}

interface ExportOptions {
  filename: string
  sheetName?: string
}

export async function exportToExcel<T>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: ExportOptions
) {
  const XLSX = await loadXLSX()

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

export async function exportMembersToExcel(members: MemberExportData[], filename?: string) {
  await exportToExcel(
    members,
    [
      { key: 'name', header: '이름' },
      { key: 'phone', header: '연락처' },
      { key: 'birthDate', header: '생년월일' },
      { key: 'department', header: '부서' },
      { key: 'isActive', header: '활동상태' },
      { key: 'joinedAt', header: '등록일' },
    ],
    { filename: filename || `교인명단_${toLocalDateString(new Date())}`, sheetName: '교인명단' }
  )
}

// 출결 기록 내보내기
export interface AttendanceExportData {
  name: string
  date: string
  worship: string
  meeting: string
}

export async function exportAttendanceToExcel(
  records: AttendanceExportData[],
  departmentName: string,
  date: string
) {
  await exportToExcel(
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

export async function exportStatsToExcel(
  stats: StatsExportData[],
  period: string
) {
  await exportToExcel(
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
      filename: `출석통계_${period}_${toLocalDateString(new Date())}`,
      sheetName: '출석통계'
    }
  )
}

// 회계장부 내보내기
export interface AccountingExportData {
  day: number
  description: string
  incomeAmount: string
  expenseAmount: string
  balance: string
  category: string
  notes: string
}

export async function exportAccountingToExcel(
  records: AccountingExportData[],
  departmentName: string,
  year: number,
  month: number
) {
  await exportToExcel(
    records,
    [
      { key: 'day', header: '일' },
      { key: 'description', header: '적요' },
      { key: 'incomeAmount', header: '수입금액' },
      { key: 'expenseAmount', header: '지출금액' },
      { key: 'balance', header: '잔액' },
      { key: 'category', header: '구분' },
      { key: 'notes', header: '비고' },
    ],
    {
      filename: `회계장부_${departmentName}_${year}년${month}월`,
      sheetName: `${year}년 ${month}월`
    }
  )
}

// 지출결의서 내보내기
export interface ExpenseRequestExportData {
  itemDate: string
  description: string
  category: string
  amount: string
  notes: string
}

export async function exportExpenseRequestToExcel(
  items: ExpenseRequestExportData[],
  departmentName: string,
  requestDate: string,
  recipientName: string,
  totalAmount: number
) {
  const XLSX = await loadXLSX()

  // 지출결의서는 특별한 형식이 필요하므로 직접 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['지출결의서'],
    [],
    ['청구부서', departmentName, '', '청구일자', requestDate],
    ['수령인', recipientName],
    [],
    ['날짜', '내용', '구분', '금액', '비고'],
    ...items.map(item => [
      item.itemDate,
      item.description,
      item.category,
      item.amount,
      item.notes
    ]),
    [],
    ['', '', '총합계', `${totalAmount.toLocaleString('ko-KR')}원`, '']
  ])

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 }
  ]

  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '지출결의서')

  // 파일 다운로드
  XLSX.writeFile(workbook, `지출결의서_${departmentName}_${requestDate}.xlsx`)
}

// 회계장부 가져오기 관련 타입
export interface AccountingImportRow {
  day: number
  description: string
  incomeAmount: number
  expenseAmount: number
  category: string
  notes?: string
}

export interface AccountingImportResult {
  data: AccountingImportRow[]
  errors: string[]
  warnings: string[]
}

// 회계장부 엑셀 가져오기
export async function importAccountingFromExcel(file: File): Promise<AccountingImportResult> {
  const XLSX = await loadXLSX()

  const result: AccountingImportResult = {
    data: [],
    errors: [],
    warnings: []
  }

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // 첫 번째 시트 사용
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // JSON으로 변환 (헤더 기반)
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

    if (jsonData.length === 0) {
      result.errors.push('엑셀 파일에 데이터가 없습니다.')
      return result
    }

    // 첫 행에서 열 이름 확인
    const firstRow = jsonData[0]
    const keys = Object.keys(firstRow)

    // 열 매핑 (유연하게 매칭)
    const dayKey = keys.find(k => k.includes('일') || k.toLowerCase() === 'day')
    const descKey = keys.find(k => k.includes('적요') || k.includes('내용') || k.includes('설명'))
    const incomeKey = keys.find(k => k.includes('수입') || k.includes('입금'))
    const expenseKey = keys.find(k => k.includes('지출') || k.includes('출금'))
    const categoryKey = keys.find(k => k.includes('구분') || k.includes('분류') || k.includes('카테고리'))
    const notesKey = keys.find(k => k.includes('비고') || k.includes('메모') || k.includes('참고'))

    if (!dayKey && !descKey) {
      result.errors.push('필수 열(일, 적요)을 찾을 수 없습니다. 엑셀 형식을 확인해주세요.')
      return result
    }

    // 데이터 파싱
    jsonData.forEach((row, index) => {
      const rowNum = index + 2 // 헤더가 1행이므로

      // 일자 파싱
      let day = 0
      if (dayKey) {
        const dayValue = row[dayKey]
        if (typeof dayValue === 'number') {
          day = dayValue
        } else if (typeof dayValue === 'string') {
          day = parseInt(dayValue) || 0
        }
      }

      // 적요
      const description = descKey ? String(row[descKey] || '').trim() : ''

      // 금액 파싱 (쉼표 제거)
      const parseAmount = (value: unknown): number => {
        if (typeof value === 'number') return Math.abs(value)
        if (typeof value === 'string') {
          const cleaned = value.replace(/[,원\s]/g, '')
          return Math.abs(parseInt(cleaned) || 0)
        }
        return 0
      }

      const incomeAmount = incomeKey ? parseAmount(row[incomeKey]) : 0
      const expenseAmount = expenseKey ? parseAmount(row[expenseKey]) : 0

      // 구분/카테고리
      const category = categoryKey ? String(row[categoryKey] || '').trim() : ''

      // 비고
      const notes = notesKey ? String(row[notesKey] || '').trim() : undefined

      // 유효성 검사
      if (!description) {
        if (day > 0 || incomeAmount > 0 || expenseAmount > 0) {
          result.warnings.push(`${rowNum}행: 적요가 비어있습니다.`)
        }
        return // 빈 행 스킵
      }

      if (day < 1 || day > 31) {
        result.warnings.push(`${rowNum}행: 일자(${day})가 유효하지 않습니다.`)
      }

      if (incomeAmount === 0 && expenseAmount === 0) {
        result.warnings.push(`${rowNum}행: 금액이 0입니다.`)
      }

      result.data.push({
        day: day || 1,
        description,
        incomeAmount,
        expenseAmount,
        category: category || (incomeAmount > 0 ? '기타 수입' : '기타'),
        notes
      })
    })

    if (result.data.length === 0 && result.errors.length === 0) {
      result.errors.push('가져올 유효한 데이터가 없습니다.')
    }

  } catch (error) {
    result.errors.push(`파일 읽기 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }

  return result
}
