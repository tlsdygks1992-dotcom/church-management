import { describe, it, expect } from 'vitest'
import { formatDate, formatPhone, formatCurrency, getWeekNumber, calculateAge } from './utils'

describe('formatDate', () => {
  it('short 형식', () => {
    expect(formatDate('2026-02-06')).toBe('2026.02.06')
  })

  it('full 형식', () => {
    expect(formatDate('2026-02-06', 'full')).toBe('2026년 2월 6일')
  })

  it('month-day 형식', () => {
    expect(formatDate('2026-02-06', 'month-day')).toBe('2월 6일')
  })

  it('잘못된 날짜는 원본 반환', () => {
    expect(formatDate('invalid')).toBe('invalid')
  })
})

describe('formatPhone', () => {
  it('11자리 전화번호 포맷', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678')
  })

  it('10자리 전화번호 포맷', () => {
    expect(formatPhone('0212345678')).toBe('021-234-5678')
  })

  it('null은 빈 문자열 반환', () => {
    expect(formatPhone(null)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('원화 형식으로 포맷', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000원')
  })

  it('0원', () => {
    expect(formatCurrency(0)).toBe('0원')
  })
})

describe('getWeekNumber', () => {
  it('주차 번호 반환', () => {
    const weekNum = getWeekNumber('2026-01-07')
    expect(weekNum).toBeGreaterThan(0)
  })
})

describe('calculateAge', () => {
  it('나이 계산', () => {
    const age = calculateAge('2000-01-01')
    expect(age).toBeGreaterThanOrEqual(25)
  })

  it('null은 null 반환', () => {
    expect(calculateAge(null)).toBeNull()
  })
})
