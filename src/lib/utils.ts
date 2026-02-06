/** 날짜 문자열을 한국어 형식으로 포맷 (YYYY-MM-DD → YYYY년 MM월 DD일) */
export function formatDate(dateStr: string, format: 'full' | 'short' | 'month-day' = 'short'): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  switch (format) {
    case 'full':
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    case 'month-day':
      return `${date.getMonth() + 1}월 ${date.getDate()}일`
    case 'short':
    default:
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }
}

/** 전화번호 포맷 (01012345678 → 010-1234-5678) */
export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/** 금액을 한국 원화 형식으로 포맷 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

/** ISO 날짜 문자열에서 주차 번호 계산 */
export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr)
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
}

/** 생년월일에서 나이 계산 */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
