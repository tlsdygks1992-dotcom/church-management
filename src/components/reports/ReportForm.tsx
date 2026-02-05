'use client'

import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createApprovalNotification } from '@/lib/notifications'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트로 동적 import
const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="h-10 bg-gray-50 border-b border-gray-200" />
      <div className="min-h-[120px] p-3 text-gray-400 text-sm">로딩 중...</div>
    </div>
  ),
})

type ReportType = 'weekly' | 'meeting' | 'education'

interface Department {
  id: string
  name: string
  code: string
}

interface ExistingReport {
  id: string
  department_id: string
  report_date: string
  week_number: number | null
  notes: string | null
  meeting_title: string | null
  meeting_location: string | null
  attendees: string | null
  main_content: string | null
  application_notes: string | null
  programs: Array<{
    id: string
    start_time: string
    content: string
    person_in_charge: string | null
    order_index: number
  }>
  newcomers: Array<{
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    introducer: string | null
    address: string | null
    affiliation: string | null
  }>
}

interface ReportFormProps {
  reportType: ReportType
  departments: Department[]
  defaultDate: string
  weekNumber: number
  authorId: string
  editMode?: boolean
  existingReport?: ExistingReport
}

interface Program {
  id?: string
  start_time: string
  end_time: string
  content: string
  person_in_charge: string
  note: string
  order_index: number
}

interface Newcomer {
  name: string
  phone: string
  birth_date: string
  introducer: string
  address: string
  affiliation: string
}

interface CellAttendance {
  cell_name: string
  registered: number
  worship: number
  meeting: number
  note: string
}

// 5분 단위 시간 옵션 (모듈 레벨 캐싱)
const TIME_OPTIONS: string[] = (() => {
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

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weekly: '주차 보고서',
  meeting: '모임 보고서',
  education: '교육 보고서',
}

// 메모이제이션된 프로그램 행 컴포넌트 (데스크톱용)
const ProgramRowDesktop = memo(function ProgramRowDesktop({
  program,
  index,
  onUpdate,
  onRemove,
}: {
  program: Program
  index: number
  onUpdate: (index: number, field: keyof Program, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <select
            value={program.start_time}
            onChange={(e) => onUpdate(index, 'start_time', e.target.value)}
            className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={`start-${index}-${time}`} value={time}>{time}</option>
            ))}
          </select>
          <span className="text-gray-400">~</span>
          <select
            value={program.end_time}
            onChange={(e) => onUpdate(index, 'end_time', e.target.value)}
            className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={`end-${index}-${time}`} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.content}
          onChange={(e) => onUpdate(index, 'content', e.target.value)}
          placeholder="예: 찬양 및 기도"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.person_in_charge}
          onChange={(e) => onUpdate(index, 'person_in_charge', e.target.value)}
          placeholder="담당자"
          className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={program.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          placeholder="비고"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

// 모바일용 프로그램 카드 컴포넌트
const ProgramCardMobile = memo(function ProgramCardMobile({
  program,
  index,
  onUpdate,
  onRemove,
}: {
  program: Program
  index: number
  onUpdate: (index: number, field: keyof Program, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">순서 {index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <select
          value={program.start_time}
          onChange={(e) => onUpdate(index, 'start_time', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={`m-start-${index}-${time}`} value={time}>{time}</option>
          ))}
        </select>
        <span className="text-gray-400 py-1.5">~</span>
        <select
          value={program.end_time}
          onChange={(e) => onUpdate(index, 'end_time', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={`m-end-${index}-${time}`} value={time}>{time}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={program.content}
        onChange={(e) => onUpdate(index, 'content', e.target.value)}
        placeholder="내용 (예: 찬양 및 기도)"
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={program.person_in_charge}
          onChange={(e) => onUpdate(index, 'person_in_charge', e.target.value)}
          placeholder="담당자"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
        <input
          type="text"
          value={program.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          placeholder="비고"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
    </div>
  )
})

// 메모이제이션된 셀 출결 행 컴포넌트
const CellAttendanceRow = memo(function CellAttendanceRow({
  cell,
  index,
  onUpdate,
  onRemove,
}: {
  cell: CellAttendance
  index: number
  onUpdate: (index: number, field: keyof CellAttendance, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-3 py-2">
        <input
          type="text"
          value={cell.cell_name}
          onChange={(e) => onUpdate(index, 'cell_name', e.target.value)}
          placeholder="셀 이름"
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.registered || ''}
          onChange={(e) => onUpdate(index, 'registered', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.worship || ''}
          onChange={(e) => onUpdate(index, 'worship', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={cell.meeting || ''}
          onChange={(e) => onUpdate(index, 'meeting', parseInt(e.target.value) || 0)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={cell.note}
          onChange={(e) => onUpdate(index, 'note', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

// 메모이제이션된 새신자 행 컴포넌트 (데스크톱용)
const NewcomerRowDesktop = memo(function NewcomerRowDesktop({
  newcomer,
  index,
  onUpdate,
  onRemove,
}: {
  newcomer: Newcomer
  index: number
  onUpdate: (index: number, field: keyof Newcomer, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <tr>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="tel"
          value={newcomer.phone}
          onChange={(e) => onUpdate(index, 'phone', e.target.value)}
          placeholder="010-0000-0000"
          className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="date"
          value={newcomer.birth_date}
          onChange={(e) => onUpdate(index, 'birth_date', e.target.value)}
          className="w-32 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.introducer}
          onChange={(e) => onUpdate(index, 'introducer', e.target.value)}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.address}
          onChange={(e) => onUpdate(index, 'address', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={newcomer.affiliation}
          onChange={(e) => onUpdate(index, 'affiliation', e.target.value)}
          className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

// 모바일용 새신자 카드 컴포넌트
const NewcomerCardMobile = memo(function NewcomerCardMobile({
  newcomer,
  index,
  onUpdate,
  onRemove,
}: {
  newcomer: Newcomer
  index: number
  onUpdate: (index: number, field: keyof Newcomer, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">새신자 {index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">이름 *</label>
          <input
            type="text"
            value={newcomer.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">연락처</label>
          <input
            type="tel"
            value={newcomer.phone}
            onChange={(e) => onUpdate(index, 'phone', e.target.value)}
            placeholder="010-0000-0000"
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">생년월일</label>
          <input
            type="date"
            value={newcomer.birth_date}
            onChange={(e) => onUpdate(index, 'birth_date', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">인도자</label>
          <input
            type="text"
            value={newcomer.introducer}
            onChange={(e) => onUpdate(index, 'introducer', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">주소</label>
        <input
          type="text"
          value={newcomer.address}
          onChange={(e) => onUpdate(index, 'address', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">소속(직업)</label>
        <input
          type="text"
          value={newcomer.affiliation}
          onChange={(e) => onUpdate(index, 'affiliation', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
        />
      </div>
    </div>
  )
})

// 섹션 정의
const SECTIONS = [
  { id: 'basic', label: '기본', icon: '📋' },
  { id: 'program', label: '순서', icon: '⏱️' },
  { id: 'attendance', label: '출결', icon: '✅' },
  { id: 'newcomer', label: '새신자', icon: '👋' },
  { id: 'photos', label: '사진', icon: '📷' },
  { id: 'notes', label: '논의', icon: '💬' },
]

export default function ReportForm({
  reportType,
  departments,
  defaultDate,
  weekNumber,
  authorId,
  editMode = false,
  existingReport,
}: ReportFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 섹션 네비게이션 상태
  const [activeSection, setActiveSection] = useState('basic')
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Intersection Observer로 현재 섹션 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const sectionId = entry.target.getAttribute('data-section')
            if (sectionId) {
              setActiveSection(sectionId)
            }
          }
        })
      },
      {
        rootMargin: '-80px 0px -50% 0px',
        threshold: [0.3]
      }
    )

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  // 섹션 스크롤
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      const yOffset = -80 // 헤더 높이 고려
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }, [])

  // 사진 업로드 상태
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  // 기존 데이터에서 notes 파싱
  const parsedNotes = existingReport?.notes ? JSON.parse(existingReport.notes) : {}

  // 공통 필드
  const [form, setForm] = useState({
    department_id: existingReport?.department_id || departments[0]?.id || '',
    report_date: existingReport?.report_date || defaultDate,
    // 주차 보고서 전용
    sermon_title: parsedNotes.sermon_title || '',
    sermon_scripture: parsedNotes.sermon_scripture || '',
    // 공통 (논의/기타)
    discussion_notes: parsedNotes.discussion_notes || '',
    other_notes: parsedNotes.other_notes || '',
    // 모임/교육 보고서 전용
    meeting_title: existingReport?.meeting_title || '',
    meeting_location: existingReport?.meeting_location || '',
    attendees: existingReport?.attendees || '',
    main_content: existingReport?.main_content || '',
    application_notes: existingReport?.application_notes || '',
  })

  // 프로그램 초기화 (기존 데이터가 있으면 사용)
  const initialPrograms: Program[] = existingReport?.programs?.length
    ? existingReport.programs.map(p => ({
        id: p.id,
        start_time: p.start_time?.slice(0, 5) || '',
        end_time: '',
        content: p.content || '',
        person_in_charge: p.person_in_charge || '',
        note: '',
        order_index: p.order_index,
      }))
    : [
        { start_time: '13:30', end_time: '13:40', content: '찬양 및 기도', person_in_charge: '', note: '', order_index: 0 },
        { start_time: '13:40', end_time: '14:00', content: '말씀', person_in_charge: '', note: '', order_index: 1 },
        { start_time: '14:00', end_time: '14:10', content: '광고', person_in_charge: '', note: '', order_index: 2 },
      ]

  const [programs, setPrograms] = useState<Program[]>(initialPrograms)

  // 셀 출결 초기화
  const initialCellAttendance: CellAttendance[] = parsedNotes.cell_attendance?.length
    ? parsedNotes.cell_attendance
    : [{ cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }]

  const [cellAttendance, setCellAttendance] = useState<CellAttendance[]>(initialCellAttendance)

  // 새신자 초기화
  const initialNewcomers: Newcomer[] = existingReport?.newcomers?.length
    ? existingReport.newcomers.map(n => ({
        name: n.name,
        phone: n.phone || '',
        birth_date: n.birth_date || '',
        introducer: n.introducer || '',
        address: n.address || '',
        affiliation: n.affiliation || '',
      }))
    : []

  const [newcomers, setNewcomers] = useState<Newcomer[]>(initialNewcomers)

  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    worship: 0,
    meeting: 0,
  })


  // 부서 변경 시 출결 데이터 로드 (주차 보고서만)
  useEffect(() => {
    if (reportType !== 'weekly') return

    const loadData = async () => {
      if (!form.department_id) return

      // member_departments를 통해 해당 부서에 속한 교인 ID 조회
      const { data: memberDeptData } = await supabase
        .from('member_departments')
        .select('member_id')
        .eq('department_id', form.department_id)

      const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]

      if (memberIds.length > 0) {
        // 활성 교인만 필터링
        const { data: activeMembers, count } = await supabase
          .from('members')
          .select('id', { count: 'exact' })
          .in('id', memberIds)
          .eq('is_active', true)

        const activeMemberIds = (activeMembers || []).map((m: { id: string }) => m.id)

        if (activeMemberIds.length > 0) {
          const { data: attendance } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('attendance_date', form.report_date)
            .in('member_id', activeMemberIds)

          const worshipCount = attendance?.filter((a: { attendance_type: string; is_present: boolean }) => a.attendance_type === 'worship' && a.is_present).length || 0
          const meetingCount = attendance?.filter((a: { attendance_type: string; is_present: boolean }) => a.attendance_type === 'meeting' && a.is_present).length || 0

          setAttendanceSummary({
            total: count || 0,
            worship: worshipCount,
            meeting: meetingCount,
          })
        } else {
          setAttendanceSummary({ total: 0, worship: 0, meeting: 0 })
        }
      } else {
        setAttendanceSummary({ total: 0, worship: 0, meeting: 0 })
      }
    }

    loadData()
  }, [form.department_id, form.report_date, supabase, reportType])

  // 프로그램 관리 (useCallback으로 최적화)
  const addProgram = useCallback(() => {
    setPrograms(prev => [...prev, { start_time: '', end_time: '', content: '', person_in_charge: '', note: '', order_index: prev.length }])
  }, [])

  const removeProgram = useCallback((index: number) => {
    setPrograms(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateProgram = useCallback((index: number, field: keyof Program, value: string | number) => {
    setPrograms(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }, [])

  // 셀 출결 관리 (주차 보고서만) (useCallback으로 최적화)
  const addCellAttendance = useCallback(() => {
    setCellAttendance(prev => [...prev, { cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }])
  }, [])

  const removeCellAttendance = useCallback((index: number) => {
    setCellAttendance(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateCellAttendance = useCallback((index: number, field: keyof CellAttendance, value: string | number) => {
    setCellAttendance(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }, [])

  // 새신자 관리 (주차 보고서만) (useCallback으로 최적화)
  const addNewcomer = useCallback(() => {
    setNewcomers(prev => [...prev, { name: '', phone: '', birth_date: '', introducer: '', address: '', affiliation: '' }])
  }, [])

  const removeNewcomer = useCallback((index: number) => {
    setNewcomers(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateNewcomer = useCallback((index: number, field: keyof Newcomer, value: string) => {
    setNewcomers(prev => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)))
  }, [])

  // 사진 추가
  const handlePhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // 최대 10장 제한
    const totalPhotos = photoFiles.length + files.length
    if (totalPhotos > 10) {
      alert('사진은 최대 10장까지 첨부할 수 있습니다.')
      return
    }

    setPhotoFiles(prev => [...prev, ...files])

    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    // input 초기화
    e.target.value = ''
  }, [photoFiles.length])

  // 사진 삭제
  const removePhoto = useCallback((index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 제출
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = true) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 셀별 합계 계산 (주차 보고서)
      const totalRegistered = reportType === 'weekly'
        ? (cellAttendance.reduce((sum, c) => sum + c.registered, 0) || attendanceSummary.total)
        : 0
      const totalWorship = reportType === 'weekly'
        ? (cellAttendance.reduce((sum, c) => sum + c.worship, 0) || attendanceSummary.worship)
        : 0
      const totalMeeting = reportType === 'weekly'
        ? (cellAttendance.reduce((sum, c) => sum + c.meeting, 0) || attendanceSummary.meeting)
        : 0

      const reportData = {
        report_type: reportType,
        department_id: form.department_id,
        report_date: form.report_date,
        week_number: reportType === 'weekly' ? weekNumber : null,
        year: new Date(form.report_date).getFullYear(),
        total_registered: totalRegistered,
        worship_attendance: totalWorship,
        meeting_attendance: totalMeeting,
        // 모임/교육 전용 필드
        meeting_title: reportType !== 'weekly' ? form.meeting_title : null,
        meeting_location: reportType !== 'weekly' ? form.meeting_location : null,
        attendees: reportType !== 'weekly' ? form.attendees : null,
        main_content: reportType !== 'weekly' ? form.main_content : null,
        application_notes: reportType === 'education' ? form.application_notes : null,
        notes: JSON.stringify({
          sermon_title: form.sermon_title,
          sermon_scripture: form.sermon_scripture,
          discussion_notes: form.discussion_notes,
          other_notes: form.other_notes,
          cell_attendance: reportType === 'weekly' ? cellAttendance : [],
        }),
        status: isDraft ? 'draft' : 'submitted',
        submitted_at: isDraft ? null : new Date().toISOString(),
      }

      let reportId: string

      if (editMode && existingReport) {
        // 수정 모드
        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update(reportData)
          .eq('id', existingReport.id)

        if (updateError) throw updateError
        reportId = existingReport.id

        // 기존 프로그램 삭제 후 재삽입
        await supabase.from('report_programs').delete().eq('report_id', reportId)

        // 기존 새신자 삭제 후 재삽입 (주차 보고서만)
        if (reportType === 'weekly') {
          await supabase.from('newcomers').delete().eq('report_id', reportId)
        }
      } else {
        // 신규 생성
        const { data: report, error: reportError } = await supabase
          .from('weekly_reports')
          .insert({ ...reportData, author_id: authorId })
          .select()
          .single()

        if (reportError) throw reportError
        reportId = report.id
      }

      // 프로그램 저장
      if (programs.length > 0) {
        const { error: programError } = await supabase
          .from('report_programs')
          .insert(
            programs.map((p, i) => ({
              report_id: reportId,
              start_time: p.start_time || '00:00',
              content: `${p.content}${p.note ? ` [${p.note}]` : ''}`,
              person_in_charge: p.person_in_charge,
              order_index: i,
            }))
          )

        if (programError) throw programError
      }

      // 새신자 저장 (주차 보고서만)
      if (reportType === 'weekly' && newcomers.length > 0) {
        const { error: newcomerError } = await supabase
          .from('newcomers')
          .insert(
            newcomers.filter(n => n.name).map(n => ({
              report_id: reportId,
              name: n.name,
              phone: n.phone || null,
              birth_date: n.birth_date || null,
              introducer: n.introducer || null,
              address: n.address || null,
              affiliation: n.affiliation || null,
              department_id: form.department_id,
            }))
          )

        if (newcomerError) throw newcomerError
      }

      // 사진 업로드
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `${reportId}/${Date.now()}_${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('report-photos')
            .upload(fileName, file)

          if (uploadError) {
            console.error('사진 업로드 실패:', uploadError)
            continue
          }

          const { data: { publicUrl } } = supabase.storage
            .from('report-photos')
            .getPublicUrl(fileName)

          await supabase.from('report_photos').insert({
            report_id: reportId,
            photo_url: publicUrl,
            order_index: i,
            uploaded_by: authorId,
          })
        }
      }

      // 제출 시 알림 생성 (신규 제출만)
      if (!isDraft && !editMode) {
        const selectedDept = departments.find(d => d.id === form.department_id)
        await createApprovalNotification(supabase, {
          reportId: reportId,
          fromStatus: 'draft',
          toStatus: 'submitted',
          departmentName: selectedDept?.name || '',
          reportType: reportType,
          authorId: authorId,
        })
      }

      router.push(`/reports?type=${reportType}`)
      router.refresh()
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 현재 보고서 유형에 맞는 섹션 필터링
  const visibleSections = useMemo(() => {
    if (reportType === 'weekly') {
      return SECTIONS
    }
    // 모임/교육 보고서는 출결/새신자 섹션 제외
    return SECTIONS.filter(s => !['attendance', 'newcomer'].includes(s.id))
  }, [reportType])

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 md:space-y-6">
      {/* 스티키 섹션 네비게이션 (모바일만) */}
      <div className="sticky top-16 z-10 -mx-4 px-4 py-2 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {visibleSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <div
        ref={(el) => { sectionRefs.current['basic'] = el }}
        data-section="basic"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4 scroll-mt-24"
      >
        <h2 className="font-semibold text-gray-900 text-base md:text-lg border-b pb-2">
          {reportType === 'weekly' ? '기본 정보' : reportType === 'meeting' ? '모임 개요' : '교육 개요'}
        </h2>

        {/* 모임/교육 제목 */}
        {reportType !== 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'meeting' ? '모임명' : '교육명'}
            </label>
            <input
              type="text"
              value={form.meeting_title}
              onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
              placeholder={reportType === 'meeting' ? '예: 청년1 셀장모임' : '예: 리더 교육'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reportType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'weekly' ? '날짜' : '일시'}
            </label>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {reportType !== 'weekly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input
                  type="text"
                  value={form.meeting_location}
                  onChange={(e) => setForm({ ...form, meeting_location: e.target.value })}
                  placeholder="예: 사무실"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">참석자</label>
                <input
                  type="text"
                  value={form.attendees}
                  onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  placeholder="예: 전홍균, 강현숙, 신요한, 김유창 (총 4명)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 진행순서 */}
      <div
        ref={(el) => { sectionRefs.current['program'] = el }}
        data-section="program"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
      >
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="font-semibold text-gray-900 text-base md:text-lg">진행순서</h2>
          <button type="button" onClick={addProgram} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
            + 항목 추가
          </button>
        </div>

        {/* 모바일: 카드 형식 */}
        <div className="md:hidden space-y-3">
          {programs.map((program, index) => (
            <ProgramCardMobile
              key={index}
              program={program}
              index={index}
              onUpdate={updateProgram}
              onRemove={removeProgram}
            />
          ))}
        </div>

        {/* 데스크톱: 테이블 형식 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left font-medium text-gray-600">시간</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">내용</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">담당</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">비고</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {programs.map((program, index) => (
                <ProgramRowDesktop
                  key={index}
                  program={program}
                  index={index}
                  onUpdate={updateProgram}
                  onRemove={removeProgram}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 말씀 정보 (주차 보고서만) */}
        {reportType === 'weekly' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">말씀 제목</label>
              <input
                type="text"
                value={form.sermon_title}
                onChange={(e) => setForm({ ...form, sermon_title: e.target.value })}
                placeholder="예: 그리스도인과 돈"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">말씀 본문</label>
              <input
                type="text"
                value={form.sermon_scripture}
                onChange={(e) => setForm({ ...form, sermon_scripture: e.target.value })}
                placeholder="예: 누가복음 16:1~13"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* 주요내용 (모임 보고서) / 교육명 (교육 보고서) */}
      {reportType !== 'weekly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
            {reportType === 'meeting' ? '주요내용' : '교육내용'}
          </label>
          <RichTextEditor
            value={form.main_content}
            onChange={(value) => setForm({ ...form, main_content: value })}
            placeholder={reportType === 'meeting' ? '주요 내용을 입력하세요' : '교육 내용을 입력하세요'}
            minHeight="150px"
          />
        </div>
      )}

      {/* 출결상황 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <div
          ref={(el) => { sectionRefs.current['attendance'] = el }}
          data-section="attendance"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="font-semibold text-gray-900 text-base md:text-lg">출결상황</h2>
            <button type="button" onClick={addCellAttendance} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
              + 셀 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">구분(셀)</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">재적</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600" colSpan={2}>출석</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">참고사항</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
                <tr className="bg-gray-50">
                  <th></th>
                  <th></th>
                  <th className="px-3 py-1 text-center text-xs text-gray-500">예배</th>
                  <th className="px-3 py-1 text-center text-xs text-gray-500">CU</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cellAttendance.map((cell, index) => (
                  <CellAttendanceRow
                    key={index}
                    cell={cell}
                    index={index}
                    onUpdate={updateCellAttendance}
                    onRemove={removeCellAttendance}
                  />
                ))}
                {/* 합계 */}
                <tr className="bg-blue-50 font-medium">
                  <td className="px-3 py-2 text-gray-700">합계</td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {cellAttendance.reduce((sum, c) => sum + c.registered, 0) || attendanceSummary.total}
                  </td>
                  <td className="px-3 py-2 text-center text-blue-700">
                    {cellAttendance.reduce((sum, c) => sum + c.worship, 0) || attendanceSummary.worship}
                  </td>
                  <td className="px-3 py-2 text-center text-green-700">
                    {cellAttendance.reduce((sum, c) => sum + c.meeting, 0) || attendanceSummary.meeting}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 새신자 명단 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <div
          ref={(el) => { sectionRefs.current['newcomer'] = el }}
          data-section="newcomer"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="font-semibold text-gray-900 text-base md:text-lg">새신자 명단</h2>
            <button type="button" onClick={addNewcomer} className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
              + 새신자 추가
            </button>
          </div>

          {newcomers.length > 0 ? (
            <>
              {/* 모바일: 카드 형식 */}
              <div className="md:hidden space-y-3">
                {newcomers.map((newcomer, index) => (
                  <NewcomerCardMobile
                    key={index}
                    newcomer={newcomer}
                    index={index}
                    onUpdate={updateNewcomer}
                    onRemove={removeNewcomer}
                  />
                ))}
              </div>

              {/* 데스크톱: 테이블 형식 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left font-medium text-gray-600">이름</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">연락처</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">생년월일</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">인도자</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">주소</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">소속(직업)</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {newcomers.map((newcomer, index) => (
                      <NewcomerRowDesktop
                        key={index}
                        newcomer={newcomer}
                        index={index}
                        onUpdate={updateNewcomer}
                        onRemove={removeNewcomer}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">새신자가 없습니다</p>
          )}
        </div>
      )}

      {/* 사진 첨부 */}
      <div
        ref={(el) => { sectionRefs.current['photos'] = el }}
        data-section="photos"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
      >
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="font-semibold text-gray-900 text-base md:text-lg">사진 첨부</h2>
          <span className="text-xs text-gray-500">{photoFiles.length}/10장</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
          {/* 미리보기 */}
          {photoPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={preview} alt={`사진 ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* 추가 버튼 */}
          {photoFiles.length < 10 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-gray-500 mt-1">추가</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="hidden"
              />
            </label>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">활동 사진을 첨부하세요 (최대 10장)</p>
      </div>

      {/* 논의사항 / 기타사항 또는 적용점 / 기타사항 */}
      <div
        ref={(el) => { sectionRefs.current['notes'] = el }}
        data-section="notes"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
              {reportType === 'education' ? '적용점' : '논의(특이)사항'}
            </label>
            <RichTextEditor
              value={reportType === 'education' ? form.application_notes : form.discussion_notes}
              onChange={(value) => setForm({
                ...form,
                [reportType === 'education' ? 'application_notes' : 'discussion_notes']: value
              })}
              placeholder={reportType === 'education' ? '적용점을 입력하세요' : '논의사항을 입력하세요'}
              minHeight="120px"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">기타사항</label>
            <RichTextEditor
              value={form.other_notes}
              onChange={(value) => setForm({ ...form, other_notes: value })}
              placeholder="기타사항을 입력하세요"
              minHeight="120px"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="sm:flex-1 px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm md:text-base order-3 sm:order-1"
        >
          취소
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="sm:flex-1 px-4 py-2.5 md:py-3 border border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm md:text-base order-2"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={loading}
          className="sm:flex-1 px-4 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base order-1 sm:order-3"
        >
          {loading ? '저장 중...' : '제출'}
        </button>
      </div>
    </form>
  )
}
