export interface Program {
  _key: string
  id?: string
  start_time: string
  end_time: string
  content: string
  person_in_charge: string
  note: string
  order_index: number
}

export interface Newcomer {
  _key: string
  name: string
  phone: string
  birth_date: string
  introducer: string
  address: string
  affiliation: string
}

export interface CellAttendance {
  _key: string
  cell_name: string
  registered: number
  worship: number
  meeting: number
  note: string
}

// 프로젝트 보고서 타입
export interface ProjectContentItem {
  _key: string
  col1: string
  col2: string
  col3: string
  col4: string
  order_index: number
}

export interface ProjectScheduleItem {
  _key: string
  schedule: string
  detail: string
  note: string
  order_index: number
}

export interface ProjectBudgetItem {
  _key: string
  category: string
  subcategory: string
  item_name: string
  basis: string
  unit_price: number
  quantity: number
  amount: number
  note: string
  order_index: number
}

/** 고유 키 생성 유틸 */
let _keyCounter = 0
export function genKey(): string {
  return `k_${Date.now()}_${++_keyCounter}`
}

// 5분 단위 시간 옵션 (모듈 레벨 캐싱)
export const TIME_OPTIONS: string[] = (() => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
})()
