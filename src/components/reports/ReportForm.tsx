'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createApprovalNotification } from '@/lib/notifications'
import { useToastContext } from '@/providers/ToastProvider'
import dynamic from 'next/dynamic'
import type { Program, Newcomer, CellAttendance, ProjectContentItem, ProjectScheduleItem, ProjectBudgetItem } from './types'
import { genKey } from './types'
import ProgramTable from './ProgramTable'
import AttendanceInput from './AttendanceInput'
import NewcomerSection from './NewcomerSection'
import PhotoUploadSection from './PhotoUploadSection'
import CellMemberAttendance from './CellMemberAttendance'
import type { MemberAttendanceItem } from './CellMemberAttendance'
import { useCells } from '@/queries/departments'
import { useCellMembers, useCellAttendanceRecords } from '@/queries/attendance'
import { useQueryClient } from '@tanstack/react-query'

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

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project'

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
  cell_id?: string | null
  // 프로젝트 보고서 전용
  projectContentItems?: Array<{
    id: string
    col1: string
    col2: string
    col3: string
    col4: string
    order_index: number
  }>
  projectScheduleItems?: Array<{
    id: string
    schedule: string
    detail: string
    note: string
    order_index: number
  }>
  projectBudgetItems?: Array<{
    id: string
    category: string
    subcategory: string
    item_name: string
    basis: string
    unit_price?: number
    quantity?: number
    amount: number
    note: string
    order_index: number
  }>
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

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weekly: '주차 보고서',
  meeting: '모임 보고서',
  education: '교육 보고서',
  cell_leader: '셀장 보고서',
  project: '프로젝트 계획',
}

// 섹션 정의
const SECTIONS = [
  { id: 'basic', label: '기본', icon: '📋' },
  { id: 'program', label: '순서', icon: '⏱️' },
  { id: 'cell-attendance', label: '출석', icon: '✅' },
  { id: 'attendance', label: '출결', icon: '✅' },
  { id: 'newcomer', label: '새신자', icon: '👋' },
  // 프로젝트 전용 섹션
  { id: 'overview', label: '개요', icon: '📝' },
  { id: 'plan', label: '계획', icon: '📊' },
  { id: 'budget', label: '예산', icon: '💰' },
  { id: 'photos', label: '사진', icon: '📷' },
  { id: 'notes', label: '논의', icon: '💬' },
]

// 프로젝트 기획서: 선택 가능한 항목
const PROJECT_OPTIONAL_SECTIONS = [
  { id: 'overview', label: '개요' },
  { id: 'purpose', label: '목적' },
  { id: 'organization', label: '조직도' },
  { id: 'content', label: '세부계획 (내용)' },
  { id: 'schedule', label: '세부계획 (일정표)' },
  { id: 'budget', label: '예산' },
  { id: 'discussion', label: '논의사항' },
  { id: 'other', label: '기타사항' },
] as const

type ProjectSectionId = typeof PROJECT_OPTIONAL_SECTIONS[number]['id']

// 기본값: 모두 활성
const ALL_PROJECT_SECTIONS: ProjectSectionId[] = PROJECT_OPTIONAL_SECTIONS.map(s => s.id)

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
  const toast = useToastContext()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 셀장보고서: 셀 선택 및 셀원 출결 상태
  const [selectedCellId, setSelectedCellId] = useState<string>(existingReport?.cell_id || '')
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendanceItem[]>([])

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

  // 프로젝트 기획서: 선택된 섹션 토글
  const [enabledSections, setEnabledSections] = useState<ProjectSectionId[]>(
    parsedNotes.project_sections || ALL_PROJECT_SECTIONS
  )
  const isSectionEnabled = useCallback((id: ProjectSectionId) => enabledSections.includes(id), [enabledSections])
  const toggleSection = useCallback((id: ProjectSectionId) => {
    setEnabledSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }, [])

  // 프로젝트 섹션 동적 번호 (활성화된 것만 순서대로)
  const sectionOrder: ProjectSectionId[] = ['overview', 'purpose', 'organization', 'content', 'schedule', 'budget']
  const projNum = useMemo(() => {
    const map: Partial<Record<ProjectSectionId, number>> = {}
    // content/schedule는 하나의 번호를 공유
    let n = 1
    for (const id of sectionOrder) {
      if (!enabledSections.includes(id)) continue
      if (id === 'schedule' && map['content']) continue // content와 같은 번호
      map[id] = n
      if (id === 'content') map['schedule'] = n // schedule도 같은 번호
      n++
    }
    return map
  }, [enabledSections])

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
    // 프로젝트 보고서 전용
    organization: parsedNotes.organization || '',
  })

  // 셀 목록 조회 (셀장보고서일 때만)
  const { data: cells = [] } = useCells(reportType === 'cell_leader' ? form.department_id : undefined)
  const { data: cellMembers = [] } = useCellMembers(reportType === 'cell_leader' && selectedCellId ? selectedCellId : undefined)
  const cellMemberIds = useMemo(() => cellMembers.map(m => m.id), [cellMembers])
  const { data: cellRecordsData } = useCellAttendanceRecords(
    editMode && reportType === 'cell_leader' ? cellMemberIds : [],
    editMode ? form.report_date : ''
  )
  const existingCellRecords = useMemo(() => cellRecordsData ?? [], [cellRecordsData])

  // 셀원 목록이 변경되면 출결 상태 초기화
  useEffect(() => {
    if (reportType !== 'cell_leader' || cellMembers.length === 0) return

    const attendanceMap = new Map(existingCellRecords.map(r => [r.member_id, r.is_present]))

    setMemberAttendance(prev => {
      // 이미 같은 셀원 목록이면 기존 상태 유지 (토글 리셋 방지)
      if (prev.length === cellMembers.length &&
          prev.every((m, i) => m.memberId === cellMembers[i]?.id)) {
        return prev
      }
      return cellMembers.map(m => ({
        memberId: m.id,
        name: m.name,
        photoUrl: m.photo_url,
        isPresent: editMode ? (attendanceMap.get(m.id) ?? false) : false,
      }))
    })
  }, [cellMembers, existingCellRecords, editMode, reportType])

  // 셀원 출석 토글
  const handleToggleMemberAttendance = useCallback((memberId: string) => {
    setMemberAttendance(prev =>
      prev.map(m => m.memberId === memberId ? { ...m, isPresent: !m.isPresent } : m)
    )
  }, [])

  // 전체 출석/초기화
  const handleBulkAttendance = useCallback((allPresent: boolean) => {
    setMemberAttendance(prev => prev.map(m => ({ ...m, isPresent: allPresent })))
  }, [])

  // 셀 변경 시 처리
  const handleCellChange = useCallback((cellId: string) => {
    setSelectedCellId(cellId)
    setMemberAttendance([])
    const cell = cells.find(c => c.id === cellId)
    if (cell) {
      setForm(prev => ({ ...prev, meeting_title: `${cell.name} 모임 보고서` }))
    }
  }, [cells])

  // 프로그램 초기화 (기존 데이터가 있으면 사용)
  const initialPrograms: Program[] = existingReport?.programs?.length
    ? existingReport.programs.map(p => ({
        _key: genKey(),
        id: p.id,
        start_time: p.start_time?.slice(0, 5) || '',
        end_time: '',
        content: p.content || '',
        person_in_charge: p.person_in_charge || '',
        note: '',
        order_index: p.order_index,
      }))
    : [
        { _key: genKey(), start_time: '13:30', end_time: '13:40', content: '찬양 및 기도', person_in_charge: '', note: '', order_index: 0 },
        { _key: genKey(), start_time: '13:40', end_time: '14:00', content: '말씀', person_in_charge: '', note: '', order_index: 1 },
        { _key: genKey(), start_time: '14:00', end_time: '14:10', content: '광고', person_in_charge: '', note: '', order_index: 2 },
      ]

  const [programs, setPrograms] = useState<Program[]>(initialPrograms)

  // 셀 출결 초기화
  const initialCellAttendance: CellAttendance[] = parsedNotes.cell_attendance?.length
    ? parsedNotes.cell_attendance.map((c: CellAttendance) => ({ ...c, _key: c._key || genKey() }))
    : [{ _key: genKey(), cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }]

  const [cellAttendance, setCellAttendance] = useState<CellAttendance[]>(initialCellAttendance)

  // 새신자 초기화
  const initialNewcomers: Newcomer[] = existingReport?.newcomers?.length
    ? existingReport.newcomers.map(n => ({
        _key: genKey(),
        name: n.name,
        phone: n.phone || '',
        birth_date: n.birth_date || '',
        introducer: n.introducer || '',
        address: n.address || '',
        affiliation: n.affiliation || '',
      }))
    : []

  const [newcomers, setNewcomers] = useState<Newcomer[]>(initialNewcomers)

  // 프로젝트 보고서: 세부계획 내용 (4열 테이블)
  const initialContentItems: ProjectContentItem[] = existingReport?.projectContentItems?.length
    ? existingReport.projectContentItems.map(c => ({
        _key: genKey(), col1: c.col1 || '', col2: c.col2 || '', col3: c.col3 || '', col4: c.col4 || '', order_index: c.order_index,
      }))
    : [{ _key: genKey(), col1: '', col2: '', col3: '', col4: '', order_index: 0 }]
  const [contentItems, setContentItems] = useState<ProjectContentItem[]>(initialContentItems)

  // 프로젝트 보고서: 세부 일정표
  const initialScheduleItems: ProjectScheduleItem[] = existingReport?.projectScheduleItems?.length
    ? existingReport.projectScheduleItems.map(s => ({
        _key: genKey(), schedule: s.schedule || '', detail: s.detail || '', note: s.note || '', order_index: s.order_index,
      }))
    : [{ _key: genKey(), schedule: '', detail: '', note: '', order_index: 0 }]
  const [scheduleItems, setScheduleItems] = useState<ProjectScheduleItem[]>(initialScheduleItems)

  // 프로젝트 보고서: 예산 (관은 항상 '교육위원회'로 자동 저장)
  const DEFAULT_BUDGET: ProjectBudgetItem[] = [
    { _key: genKey(), category: '교육위원회', subcategory: '', item_name: '', basis: '', unit_price: 0, quantity: 1, amount: 0, note: '', order_index: 0 },
  ]
  const initialBudgetItems: ProjectBudgetItem[] = existingReport?.projectBudgetItems?.length
    ? existingReport.projectBudgetItems.map(b => ({
        _key: genKey(), category: b.category || '', subcategory: b.subcategory || '', item_name: b.item_name || '',
        basis: b.basis || '', unit_price: b.unit_price ?? b.amount ?? 0, quantity: b.quantity ?? 1,
        amount: b.amount || 0, note: b.note || '', order_index: b.order_index,
      }))
    : DEFAULT_BUDGET
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>(initialBudgetItems)

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

  // 프로그램 관리
  const addProgram = useCallback(() => {
    setPrograms(prev => [...prev, { _key: genKey(), start_time: '', end_time: '', content: '', person_in_charge: '', note: '', order_index: prev.length }])
  }, [])

  const removeProgram = useCallback((index: number) => {
    setPrograms(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateProgram = useCallback((index: number, field: keyof Program, value: string | number) => {
    setPrograms(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }, [])

  // 셀 출결 관리
  const addCellAttendance = useCallback(() => {
    setCellAttendance(prev => [...prev, { _key: genKey(), cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }])
  }, [])

  const removeCellAttendance = useCallback((index: number) => {
    setCellAttendance(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateCellAttendance = useCallback((index: number, field: keyof CellAttendance, value: string | number) => {
    setCellAttendance(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }, [])

  // 새신자 관리
  const addNewcomer = useCallback(() => {
    setNewcomers(prev => [...prev, { _key: genKey(), name: '', phone: '', birth_date: '', introducer: '', address: '', affiliation: '' }])
  }, [])

  const removeNewcomer = useCallback((index: number) => {
    setNewcomers(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateNewcomer = useCallback((index: number, field: keyof Newcomer, value: string) => {
    setNewcomers(prev => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)))
  }, [])

  // 프로젝트: 세부계획 내용 관리
  const addContentItem = useCallback(() => {
    setContentItems(prev => [...prev, { _key: genKey(), col1: '', col2: '', col3: '', col4: '', order_index: prev.length }])
  }, [])
  const removeContentItem = useCallback((index: number) => {
    setContentItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateContentItem = useCallback((index: number, field: keyof ProjectContentItem, value: string) => {
    setContentItems(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }, [])

  // 프로젝트: 일정표 관리
  const addScheduleItem = useCallback(() => {
    setScheduleItems(prev => [...prev, { _key: genKey(), schedule: '', detail: '', note: '', order_index: prev.length }])
  }, [])
  const removeScheduleItem = useCallback((index: number) => {
    setScheduleItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateScheduleItem = useCallback((index: number, field: keyof ProjectScheduleItem, value: string) => {
    setScheduleItems(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }, [])

  // 프로젝트: 예산 관리
  const addBudgetItem = useCallback(() => {
    setBudgetItems(prev => [...prev, { _key: genKey(), category: '교육위원회', subcategory: '', item_name: '', basis: '', unit_price: 0, quantity: 1, amount: 0, note: '', order_index: prev.length }])
  }, [])
  const removeBudgetItem = useCallback((index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateBudgetItem = useCallback((index: number, field: keyof ProjectBudgetItem, value: string | number) => {
    setBudgetItems(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }, [])

  // 사진 추가
  const handlePhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // 파일 타입/크기 검증
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error('지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP만 가능)')
        return
      }
      if (f.size > MAX_SIZE) {
        toast.error('파일 크기는 10MB 이하만 가능합니다.')
        return
      }
    }

    // 최대 10장 제한
    const totalPhotos = photoFiles.length + files.length
    if (totalPhotos > 10) {
      toast.warning('사진은 최대 10장까지 첨부할 수 있습니다.')
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

      // 셀장보고서에서 셀 선택 시 출석자 명단 자동 생성
      const cellLeaderAttendees = (reportType === 'cell_leader' && selectedCellId && memberAttendance.length > 0)
        ? (() => {
            const presentNames = memberAttendance.filter(m => m.isPresent).map(m => m.name)
            return presentNames.length > 0 ? `${presentNames.join(', ')} (총 ${presentNames.length}명)` : ''
          })()
        : form.attendees

      const reportData = {
        report_type: reportType,
        department_id: form.department_id,
        report_date: form.report_date,
        week_number: reportType === 'weekly' ? weekNumber : null,
        year: new Date(form.report_date).getFullYear(),
        total_registered: totalRegistered,
        worship_attendance: totalWorship,
        meeting_attendance: totalMeeting,
        cell_id: reportType === 'cell_leader' ? (selectedCellId || null) : null,
        // 모임/교육/셀장/프로젝트 전용 필드
        meeting_title: reportType !== 'weekly' ? form.meeting_title : null,
        meeting_location: reportType !== 'weekly' && reportType !== 'cell_leader' && reportType !== 'project' ? form.meeting_location : null,
        attendees: reportType !== 'weekly' && reportType !== 'project' ? cellLeaderAttendees : null,
        main_content: reportType !== 'weekly' ? form.main_content : null,
        application_notes: ['education', 'cell_leader', 'project'].includes(reportType) ? form.application_notes : null,
        notes: JSON.stringify({
          sermon_title: form.sermon_title,
          sermon_scripture: form.sermon_scripture,
          discussion_notes: form.discussion_notes,
          other_notes: form.other_notes,
          cell_attendance: reportType === 'weekly' ? cellAttendance.map(({ _key, ...rest }) => rest) : [],
          organization: reportType === 'project' ? form.organization : undefined,
          project_sections: reportType === 'project' ? enabledSections : undefined,
        }),
        status: isDraft ? 'draft' : 'submitted',
        submitted_at: isDraft ? null : new Date().toISOString(),
      }

      let reportId: string

      if (editMode && existingReport) {
        // 수정 모드 (재제출 시 반려 정보 초기화)
        const updatePayload = {
          ...reportData,
          ...(!isDraft ? {
            rejected_by: null,
            rejected_at: null,
            rejection_reason: null,
          } : {}),
        }
        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update(updatePayload)
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

      // 프로그램 저장 (셀장/프로젝트 보고서 제외)
      if (reportType !== 'cell_leader' && reportType !== 'project' && programs.length > 0) {
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

      // 프로젝트 보고서: 세부계획/일정표/예산 저장
      if (reportType === 'project') {
        // 기존 데이터 삭제 (수정 모드)
        if (editMode && existingReport) {
          await supabase.from('project_content_items').delete().eq('report_id', reportId)
          await supabase.from('project_schedule_items').delete().eq('report_id', reportId)
          await supabase.from('project_budget_items').delete().eq('report_id', reportId)
        }
        // 세부계획 내용
        if (contentItems.some(c => c.col1 || c.col2 || c.col3 || c.col4)) {
          await supabase.from('project_content_items').insert(
            contentItems.filter(c => c.col1 || c.col2 || c.col3 || c.col4).map((c, i) => ({
              report_id: reportId, col1: c.col1, col2: c.col2, col3: c.col3, col4: c.col4, order_index: i,
            }))
          )
        }
        // 세부 일정표
        if (scheduleItems.some(s => s.schedule || s.detail)) {
          await supabase.from('project_schedule_items').insert(
            scheduleItems.filter(s => s.schedule || s.detail).map((s, i) => ({
              report_id: reportId, schedule: s.schedule, detail: s.detail, note: s.note, order_index: i,
            }))
          )
        }
        // 예산
        if (budgetItems.some(b => b.item_name || b.unit_price > 0)) {
          await supabase.from('project_budget_items').insert(
            budgetItems.filter(b => b.item_name || b.unit_price > 0).map((b, i) => ({
              report_id: reportId, category: b.category, subcategory: b.subcategory, item_name: b.item_name,
              basis: b.basis, unit_price: b.unit_price || 0, quantity: b.quantity || 1,
              amount: (b.unit_price || 0) * (b.quantity || 0), note: b.note, order_index: i,
            }))
          )
        }
      }

      // 셀장보고서: 셀원 출결 → attendance_records 연동
      if (reportType === 'cell_leader' && selectedCellId && memberAttendance.length > 0) {
        // 편집 모드: 기존 출결 레코드 삭제 (이 보고서에서 생성한 것만)
        if (editMode && existingReport) {
          await supabase
            .from('attendance_records')
            .delete()
            .eq('report_id', reportId)
        }

        // 출석자만 upsert
        const presentMembers = memberAttendance.filter(m => m.isPresent)
        if (presentMembers.length > 0) {
          const { error: attendanceError } = await supabase
            .from('attendance_records')
            .upsert(
              presentMembers.map(m => ({
                member_id: m.memberId,
                report_id: reportId,
                attendance_date: form.report_date,
                attendance_type: 'meeting' as const,
                is_present: true,
                checked_by: authorId,
                checked_via: 'cell_report',
              })),
              { onConflict: 'member_id,attendance_date,attendance_type' }
            )
          if (attendanceError) {
            console.error('출결 저장 오류:', attendanceError)
            toast.error('출결 저장 중 오류가 발생했습니다.')
          }
        }

        // 결석자: 기존에 있던 출석 기록이 있으면 삭제
        const absentMembers = memberAttendance.filter(m => !m.isPresent)
        if (absentMembers.length > 0) {
          await supabase
            .from('attendance_records')
            .delete()
            .in('member_id', absentMembers.map(m => m.memberId))
            .eq('attendance_date', form.report_date)
            .eq('attendance_type', 'meeting')
            .eq('checked_via', 'cell_report')
        }

        // 출결 캐시 무효화
        queryClient.invalidateQueries({ queryKey: ['attendance'] })
      }

      // 사진 업로드
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i]
          const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
          const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
          if (!ALLOWED_EXTENSIONS.includes(fileExt)) continue
          const fileName = `${reportId}/${Date.now()}_${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('report-photos')
            .upload(fileName, file)

          if (uploadError) {
            console.error('사진 업로드 실패:', uploadError)
            toast.warning('일부 사진 업로드에 실패했습니다.')
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

      // 제출 시 알림 생성 (신규 제출 + 재제출 모두)
      if (!isDraft) {
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

      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.push(`/reports?type=${reportType}`)
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
      return SECTIONS.filter(s => !['cell-attendance', 'overview', 'plan', 'budget'].includes(s.id))
    }
    if (reportType === 'cell_leader') {
      // 셀장 보고서: 순서/출결(weekly)/새신자/프로젝트 섹션 제외, cell-attendance 포함
      return SECTIONS.filter(s => !['program', 'attendance', 'newcomer', 'overview', 'plan', 'budget'].includes(s.id))
    }
    if (reportType === 'project') {
      // 프로젝트: 순서/출결/새신자/셀출석 제외
      const hideNav: string[] = ['program', 'cell-attendance', 'attendance', 'newcomer']
      // 토글로 비활성화된 섹션의 네비게이션도 제외
      if (!enabledSections.includes('overview') && !enabledSections.includes('purpose') && !enabledSections.includes('organization')) hideNav.push('overview')
      if (!enabledSections.includes('content') && !enabledSections.includes('schedule')) hideNav.push('plan')
      if (!enabledSections.includes('budget')) hideNav.push('budget')
      if (!enabledSections.includes('discussion') && !enabledSections.includes('other')) hideNav.push('notes')
      return SECTIONS.filter(s => !hideNav.includes(s.id))
    }
    // 모임/교육 보고서는 출결/새신자/프로젝트/셀출석 섹션 제외
    return SECTIONS.filter(s => !['cell-attendance', 'attendance', 'newcomer', 'overview', 'plan', 'budget'].includes(s.id))
  }, [reportType, enabledSections])

  // sectionRef 콜백 생성
  const setSectionRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[key] = el
  }, [])

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
          {reportType === 'weekly' ? '기본 정보' : reportType === 'cell_leader' ? '셀 모임 개요' : reportType === 'project' ? '프로젝트 기본 정보' : reportType === 'meeting' ? '모임 개요' : '교육 개요'}
        </h2>

        {/* 모임/교육 제목 */}
        {reportType !== 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'cell_leader' ? '셀 모임명' : reportType === 'project' ? '프로젝트명' : reportType === 'meeting' ? '모임명' : '교육명'}
            </label>
            <input
              type="text"
              value={form.meeting_title}
              onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
              placeholder={reportType === 'cell_leader' ? '예: 현진셀 모임 보고서' : reportType === 'project' ? '예: 2024 교육부 프로젝트' : reportType === 'meeting' ? '예: 청년1 셀장모임' : '예: 리더 교육'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 부서 (모든 보고서 공통) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={form.department_id}
              onChange={(e) => {
                setForm({ ...form, department_id: e.target.value })
                if (reportType === 'cell_leader') {
                  setSelectedCellId('')
                  setMemberAttendance([])
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

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

          {/* 셀장보고서: 셀 선택 드롭다운 */}
          {reportType === 'cell_leader' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">셀 선택</label>
              <select
                value={selectedCellId}
                onChange={(e) => handleCellChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">셀을 선택하세요</option>
                {cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== 'weekly' && reportType !== 'project' && (
            <>
              {reportType !== 'cell_leader' && (
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
              )}
              {/* 셀장보고서에서 셀이 선택된 경우 참석자 입력 숨김 (체크박스로 대체) */}
              {!(reportType === 'cell_leader' && selectedCellId) && (
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
              )}
            </>
          )}
        </div>
      </div>

      {/* 프로젝트 기획서: 포함할 항목 선택 */}
      {reportType === 'project' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 md:p-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">포함할 항목</h2>
            <button
              type="button"
              onClick={() => setEnabledSections(
                enabledSections.length === ALL_PROJECT_SECTIONS.length ? [] : [...ALL_PROJECT_SECTIONS]
              )}
              className="text-xs text-blue-600 font-medium"
            >
              {enabledSections.length === ALL_PROJECT_SECTIONS.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROJECT_OPTIONAL_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  isSectionEnabled(section.id)
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                }`}
              >
                {isSectionEnabled(section.id) ? '✓ ' : ''}{section.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 진행순서 (셀장/프로젝트 보고서 제외) */}
      {reportType !== 'cell_leader' && reportType !== 'project' && (
        <ProgramTable
          programs={programs}
          onAdd={addProgram}
          onUpdate={updateProgram}
          onRemove={removeProgram}
          sectionRef={setSectionRef('program')}
        />
      )}

      {/* 말씀 정보 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      )}

      {/* 셀원 출석 체크 (셀장보고서 + 셀 선택됨) */}
      {reportType === 'cell_leader' && selectedCellId && (
        <CellMemberAttendance
          memberAttendance={memberAttendance}
          onToggle={handleToggleMemberAttendance}
          onBulkAction={handleBulkAttendance}
          sectionRef={setSectionRef('cell-attendance')}
        />
      )}

      {/* 주요내용 (모임/교육/셀장 보고서 - 프로젝트 제외) */}
      {reportType !== 'weekly' && reportType !== 'project' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
            {reportType === 'cell_leader' ? '나눔 내용' : reportType === 'meeting' ? '주요내용' : '교육내용'}
          </label>
          <RichTextEditor
            value={form.main_content}
            onChange={(value) => setForm({ ...form, main_content: value })}
            placeholder={reportType === 'cell_leader' ? '셀 모임에서 나눈 내용을 입력하세요' : reportType === 'meeting' ? '주요 내용을 입력하세요' : '교육 내용을 입력하세요'}
            minHeight="150px"
          />
        </div>
      )}

      {/* 프로젝트: 개요/목적/조직도 */}
      {reportType === 'project' && (isSectionEnabled('overview') || isSectionEnabled('purpose') || isSectionEnabled('organization')) && (
        <div
          ref={(el) => { sectionRefs.current['overview'] = el }}
          data-section="overview"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4 scroll-mt-24"
        >
          {isSectionEnabled('overview') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.overview}. 개요</label>
              <RichTextEditor
                value={form.main_content}
                onChange={(value) => setForm({ ...form, main_content: value })}
                placeholder="프로젝트 개요를 입력하세요"
                minHeight="120px"
              />
            </div>
          )}
          {isSectionEnabled('purpose') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.purpose}. 목적</label>
              <RichTextEditor
                value={form.application_notes}
                onChange={(value) => setForm({ ...form, application_notes: value })}
                placeholder="프로젝트 목적을 입력하세요"
                minHeight="120px"
              />
            </div>
          )}
          {isSectionEnabled('organization') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.organization}. 조직도</label>
              <RichTextEditor
                value={form.organization}
                onChange={(value) => setForm({ ...form, organization: value })}
                placeholder="조직 구성을 입력하세요"
                minHeight="100px"
              />
            </div>
          )}
        </div>
      )}

      {/* 프로젝트: 세부계획 (내용 + 일정표) */}
      {reportType === 'project' && (isSectionEnabled('content') || isSectionEnabled('schedule')) && (
        <div
          ref={(el) => { sectionRefs.current['plan'] = el }}
          data-section="plan"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-6 scroll-mt-24"
        >
          <h2 className="font-semibold text-gray-900 text-base md:text-lg border-b pb-2">{projNum.content || projNum.schedule}. 세부 계획</h2>

          {/* 내용 테이블 (4열) */}
          {isSectionEnabled('content') && <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700 text-sm">내용</label>
              <button
                type="button"
                onClick={addContentItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">항목</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">내용</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">담당</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">비고</th>
                    <th className="px-2 py-2 border-b w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {contentItems.map((item, i) => (
                    <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-1 py-1"><input type="text" value={item.col1} onChange={(e) => updateContentItem(i, 'col1', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="항목" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col2} onChange={(e) => updateContentItem(i, 'col2', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="내용" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col3} onChange={(e) => updateContentItem(i, 'col3', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="담당" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col4} onChange={(e) => updateContentItem(i, 'col4', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="비고" /></td>
                      <td className="px-1 py-1 text-center">
                        {contentItems.length > 1 && (
                          <button type="button" onClick={() => removeContentItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* 세부 일정표 */}
          {isSectionEnabled('schedule') && <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700 text-sm">세부 일정표</label>
              <button
                type="button"
                onClick={addScheduleItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '30%' }}>일정표</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">세부내용</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '20%' }}>비고</th>
                    <th className="px-2 py-2 border-b w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleItems.map((item, i) => (
                    <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-1 py-1"><input type="text" value={item.schedule} onChange={(e) => updateScheduleItem(i, 'schedule', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="예: 3월 1주차" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.detail} onChange={(e) => updateScheduleItem(i, 'detail', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="세부내용" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.note} onChange={(e) => updateScheduleItem(i, 'note', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="비고" /></td>
                      <td className="px-1 py-1 text-center">
                        {scheduleItems.length > 1 && (
                          <button type="button" onClick={() => removeScheduleItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      )}

      {/* 프로젝트: 예산 */}
      {reportType === 'project' && isSectionEnabled('budget') && (
        <div
          ref={(el) => { sectionRefs.current['budget'] = el }}
          data-section="budget"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-base md:text-lg">{projNum.budget}. 예산 <span className="text-xs font-normal text-gray-400">(단위: 원)</span></h2>
            <button
              type="button"
              onClick={addBudgetItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + 항목 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '13%' }}>항</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '13%' }}>목</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '20%' }}>세부품목</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '14%' }}>금액</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '10%' }}>개수</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '14%' }}>합계</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '12%' }}>비고</th>
                  <th className="px-1 py-2 border-b w-8"></th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item, i) => (
                  <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-1 py-1"><input type="text" value={item.subcategory} onChange={(e) => updateBudgetItem(i, 'subcategory', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1"><input type="text" value={item.item_name} onChange={(e) => updateBudgetItem(i, 'item_name', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1"><input type="text" value={item.basis} onChange={(e) => updateBudgetItem(i, 'basis', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" placeholder="세부품목" /></td>
                    <td className="px-1 py-1"><input type="number" value={item.unit_price || ''} onChange={(e) => updateBudgetItem(i, 'unit_price', parseInt(e.target.value) || 0)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs text-right" placeholder="0" /></td>
                    <td className="px-1 py-1"><input type="number" value={item.quantity || ''} onChange={(e) => updateBudgetItem(i, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs text-right" placeholder="1" /></td>
                    <td className="px-1 py-1 text-right text-xs font-medium text-gray-900 whitespace-nowrap">
                      {((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                    </td>
                    <td className="px-1 py-1"><input type="text" value={item.note} onChange={(e) => updateBudgetItem(i, 'note', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeBudgetItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50">
                  <td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-900 text-sm">합계</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-700 text-sm">
                    {budgetItems.reduce((sum, b) => sum + ((b.unit_price || 0) * (b.quantity || 0)), 0).toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 출결상황 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <AttendanceInput
          cellAttendance={cellAttendance}
          attendanceSummary={attendanceSummary}
          onAdd={addCellAttendance}
          onUpdate={updateCellAttendance}
          onRemove={removeCellAttendance}
          sectionRef={setSectionRef('attendance')}
        />
      )}

      {/* 새신자 명단 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <NewcomerSection
          newcomers={newcomers}
          onAdd={addNewcomer}
          onUpdate={updateNewcomer}
          onRemove={removeNewcomer}
          sectionRef={setSectionRef('newcomer')}
        />
      )}

      {/* 사진 첨부 */}
      <PhotoUploadSection
        photoFiles={photoFiles}
        photoPreviews={photoPreviews}
        onPhotoAdd={handlePhotoAdd}
        onPhotoRemove={removePhoto}
        sectionRef={setSectionRef('photos')}
      />

      {/* 논의사항 / 기타사항 (프로젝트: 토글 가능) */}
      {(reportType !== 'project' || isSectionEnabled('discussion') || isSectionEnabled('other')) && (
        <div
          ref={(el) => { sectionRefs.current['notes'] = el }}
          data-section="notes"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {(reportType !== 'project' || isSectionEnabled('discussion')) && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
                  {reportType === 'cell_leader' ? '기도제목' : reportType === 'education' ? '적용점' : '논의(특이)사항'}
                </label>
                <RichTextEditor
                  value={reportType === 'cell_leader' || reportType === 'education' ? form.application_notes : form.discussion_notes}
                  onChange={(value) => setForm({
                    ...form,
                    [reportType === 'cell_leader' || reportType === 'education' ? 'application_notes' : 'discussion_notes']: value
                  })}
                  placeholder={reportType === 'cell_leader' ? '기도제목을 입력하세요' : reportType === 'education' ? '적용점을 입력하세요' : '논의사항을 입력하세요'}
                  minHeight="120px"
                />
              </div>
            )}
            {(reportType !== 'project' || isSectionEnabled('other')) && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">기타사항</label>
                <RichTextEditor
                  value={form.other_notes}
                  onChange={(value) => setForm({ ...form, other_notes: value })}
                  placeholder="기타사항을 입력하세요"
                  minHeight="120px"
                />
              </div>
            )}
          </div>
        </div>
      )}

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
