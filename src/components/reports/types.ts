export interface Program {
  id?: string
  start_time: string
  end_time: string
  content: string
  person_in_charge: string
  note: string
  order_index: number
}

export interface Newcomer {
  name: string
  phone: string
  birth_date: string
  introducer: string
  address: string
  affiliation: string
}

export interface CellAttendance {
  cell_name: string
  registered: number
  worship: number
  meeting: number
  note: string
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
