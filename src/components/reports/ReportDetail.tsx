'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { createApprovalNotification } from '@/lib/notifications'
import { useToastContext } from '@/providers/ToastProvider'
import { useAuth } from '@/providers/AuthProvider'
import { canAccessAllDepartments, canViewReport } from '@/lib/permissions'
import { useReportDetail, useReportPrograms, useReportNewcomers, useApprovalHistory, useTeamLeaderIds } from '@/queries/reports'

type ReportType = 'weekly' | 'meeting' | 'education'

interface ReportDetailProps {
  reportId: string
}

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
}

/** 결재 단계별 권한 확인 */
function checkApprovalPermission(userRole: string, reportStatus: string): string | null {
  // 보고 체계: 팀장 → 회장(협조) → 부장(결재) → 목사(확인)
  if (reportStatus === 'submitted') {
    if (userRole === 'president' || userRole === 'super_admin') return 'coordinator'
  }
  if (reportStatus === 'coordinator_reviewed') {
    if (userRole === 'accountant' || userRole === 'super_admin') return 'manager'
  }
  if (reportStatus === 'manager_approved') {
    if (userRole === 'super_admin') return 'final'
  }
  return null
}

export default function ReportDetail({ reportId }: ReportDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const toast = useToastContext()
  const { user: currentUser } = useAuth()

  // 데이터 조회
  const { data: report, isLoading: reportLoading } = useReportDetail(reportId)
  const { data: programs = [], isLoading: programsLoading } = useReportPrograms(reportId)
  const { data: newcomers = [] } = useReportNewcomers(reportId)
  const { data: history = [] } = useApprovalHistory(reportId)
  const { data: teamLeaderIds = [] } = useTeamLeaderIds(report?.department_id)

  // 권한 계산
  const userRole = currentUser?.role || ''
  const canApprove = useMemo(
    () => report ? checkApprovalPermission(userRole, report.status) : null,
    [userRole, report?.status]
  )
  const canDelete = canAccessAllDepartments(userRole)

  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // 로딩 상태
  if (reportLoading || programsLoading || !currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  // 보고서 없음
  if (!report) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        <div className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">보고서를 찾을 수 없습니다</h2>
          <button onClick={() => router.push('/reports')} className="text-blue-600 text-sm hover:underline">
            보고서 목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // 보고서 열람 권한 체크
  const authorIsTeamLeader = teamLeaderIds.includes(report.author_id)
  if (!canViewReport(currentUser, report, authorIsTeamLeader)) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">열람 권한 없음</h2>
          <p className="text-sm text-yellow-600">이 보고서를 열람할 권한이 없습니다.</p>
        </div>
      </div>
    )
  }

  // 작성자이고 제출된 상태일 때만 취소 가능
  const canCancelSubmission = currentUser?.id === report.author_id && report.status === 'submitted'

  const reportType = (report as any).report_type || 'weekly'
  const typeConfig = REPORT_TYPE_CONFIG[reportType as ReportType]

  // 부서명 표시
  const getDeptDisplayName = useCallback(() => {
    const code = report.departments?.code
    if (code === 'ck') return '유치부/아동부'
    if (code === 'cu_worship') return 'CU워십'
    if (code === 'youth') return '청소년부'
    if (code === 'cu1') return '1청년'
    if (code === 'cu2') return '2청년'
    if (code === 'leader') return '리더'
    return report.departments?.name || ''
  }, [report.departments])

  // 날짜 포맷
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }, [])

  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [printerIP, setPrinterIP] = useState('')

  // 저장된 프린터 IP 불러오기
  useEffect(() => {
    const savedIP = localStorage.getItem('printerIP')
    if (savedIP) {
      setPrinterIP(savedIP)
    }
  }, [])

  const handlePrint = useCallback((directIP?: string) => {
    let parsedNotes: Record<string, any> = {}
    try {
      parsedNotes = report.notes ? JSON.parse(report.notes) : {}
    } catch {
      parsedNotes = {}
    }
    const cellAttendance = parsedNotes.cell_attendance || []
    const reportDate = new Date(report.report_date)

    // 보고서 유형에 따라 다른 HTML 생성
    let html = ''

    if (reportType === 'weekly') {
      // 주차 보고서 인쇄 (기존 코드)
      const programRows = programs.length > 0
        ? programs.map(p => {
            const time = p.start_time ? p.start_time.slice(0, 5) : ''
            let content = p.content || ''
            if (parsedNotes.sermon_title && content.includes('말씀')) {
              content += ` [${parsedNotes.sermon_title} ${parsedNotes.sermon_scripture || ''}]`
            }
            return `<tr>
              <td class="cell">${time}</td>
              <td class="cell" style="text-align:left;">${content}</td>
              <td class="cell">${p.person_in_charge || ''}</td>
              <td class="cell"></td>
            </tr>`
          }).join('')
        : `<tr><td class="cell" colspan="4" style="height:60px;"></td></tr>`

      let attendanceRows = ''
      if (cellAttendance.length > 0 && cellAttendance.some((c: any) => c.cell_name)) {
        attendanceRows = cellAttendance.map((cell: any) => `
          <tr>
            <td class="cell">${cell.cell_name || ''}</td>
            <td class="cell">${cell.registered || ''}</td>
            <td class="cell">${cell.worship || ''}</td>
            <td class="cell">${cell.meeting || ''}</td>
            <td class="cell" style="text-align:left;">${cell.note || ''}</td>
          </tr>
        `).join('')
      } else {
        for (let i = 0; i < 3; i++) {
          attendanceRows += `<tr>
            <td class="cell" style="height:28px;"></td>
            <td class="cell"></td>
            <td class="cell"></td>
            <td class="cell"></td>
            <td class="cell"></td>
          </tr>`
        }
      }

      const newcomerRows = newcomers.length > 0
        ? newcomers.map(n => `
            <tr>
              <td class="cell">${n.name}</td>
              <td class="cell">${n.phone || ''}</td>
              <td class="cell">${n.birth_date || ''}</td>
              <td class="cell">${n.introducer || ''}</td>
              <td class="cell" style="text-align:left;">${n.address || ''}</td>
              <td class="cell">${n.affiliation || ''}</td>
            </tr>
          `).join('')
        : `<tr><td class="cell" colspan="6" style="height:28px;"></td></tr>`

      html = generateWeeklyPrintHTML(getDeptDisplayName(), report, reportDate, programRows, attendanceRows, newcomerRows, parsedNotes)
    } else {
      // 모임/교육 보고서 인쇄
      const programRows = programs.length > 0
        ? programs.map(p => {
            const time = p.start_time ? p.start_time.slice(0, 5) : ''
            return `<tr>
              <td class="cell">${time}</td>
              <td class="cell" style="text-align:left;">${p.content || ''}</td>
              <td class="cell">${p.person_in_charge || ''}</td>
              <td class="cell"></td>
            </tr>`
          }).join('')
        : `<tr><td class="cell" colspan="4" style="height:60px;"></td></tr>`

      html = generateMeetingPrintHTML(
        reportType,
        report.meeting_title || getDeptDisplayName(),
        report,
        reportDate,
        programRows,
        parsedNotes
      )
    }

    // 인쇄 실행
    const printFrame = document.createElement('iframe')
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = 'none'
    document.body.appendChild(printFrame)

    const frameDoc = printFrame.contentWindow?.document
    if (frameDoc) {
      frameDoc.open()
      frameDoc.write(html)
      frameDoc.close()

      printFrame.onload = () => {
        setTimeout(() => {
          printFrame.contentWindow?.focus()
          printFrame.contentWindow?.print()
          setTimeout(() => {
            document.body.removeChild(printFrame)
          }, 1000)
        }, 250)
      }
    }

    setShowPrintOptions(false)
  }, [report, programs, newcomers, getDeptDisplayName, reportType])

  // 제출 취소 처리
  const handleCancelSubmission = async () => {
    if (!canCancelSubmission || !currentUser) return
    setLoading(true)
    setShowCancelModal(false)

    try {
      // 상태를 draft로 변경
      await supabase
        .from('weekly_reports')
        .update({
          status: 'draft',
          submitted_at: null,
        })
        .eq('id', report.id)

      // 결재 이력 추가
      await supabase.from('approval_history').insert({
        report_id: report.id,
        approver_id: currentUser.id,
        from_status: 'submitted',
        to_status: 'draft',
        comment: '제출 취소',
      })

      // 쿼리 캐시 무효화 → 자동 refetch
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('제출이 취소되었습니다.')
    } catch (error) {
      console.error('Failed to cancel submission:', error)
      toast.error('제출 취소 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 관리자 보고서 삭제
  const handleDelete = async () => {
    if (!canDelete || !currentUser) return
    setLoading(true)
    setShowDeleteModal(false)

    try {
      // 관련 테이블 순서대로 삭제 (외래키 제약 순서)
      await supabase.from('report_programs').delete().eq('report_id', report.id)
      await supabase.from('newcomers').delete().eq('report_id', report.id)
      await supabase.from('approval_history').delete().eq('report_id', report.id)
      await supabase.from('attendance_records').delete().eq('report_id', report.id)
      await supabase.from('notifications').delete().eq('report_id', report.id)
      await supabase.from('report_photos').delete().eq('report_id', report.id)

      const { error } = await supabase.from('weekly_reports').delete().eq('id', report.id)
      if (error) throw error

      // 관련 쿼리 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('보고서가 삭제되었습니다.')
      router.push('/reports')
    } catch (error) {
      console.error('Failed to delete report:', error)
      toast.error('보고서 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async () => {
    if (!canApprove || !currentUser) return
    setLoading(true)

    // 즉시 모달 닫기 (UX 개선)
    setShowApprovalModal(false)

    try {
      const now = new Date().toISOString()
      let newStatus = report.status
      const updateData: Record<string, any> = {}

      if (approvalAction === 'approve') {
        if (canApprove === 'coordinator') {
          newStatus = 'coordinator_reviewed'
          updateData.coordinator_id = currentUser.id
          updateData.coordinator_reviewed_at = now
          updateData.coordinator_comment = comment
        } else if (canApprove === 'manager') {
          newStatus = 'manager_approved'
          updateData.manager_id = currentUser.id
          updateData.manager_approved_at = now
          updateData.manager_comment = comment
        } else if (canApprove === 'final') {
          newStatus = 'final_approved'
          updateData.final_approver_id = currentUser.id
          updateData.final_approved_at = now
          updateData.final_comment = comment
        }
      } else {
        newStatus = 'rejected'
        updateData.rejected_by = currentUser.id
        updateData.rejected_at = now
        updateData.rejection_reason = comment
      }

      // 병렬 처리 - DB 업데이트, 히스토리, 알림을 동시에 실행
      await Promise.all([
        supabase
          .from('weekly_reports')
          .update({ ...updateData, status: newStatus })
          .eq('id', report.id),
        supabase.from('approval_history').insert({
          report_id: report.id,
          approver_id: currentUser.id,
          from_status: report.status,
          to_status: newStatus,
          comment,
        }),
        createApprovalNotification(supabase, {
          reportId: report.id,
          fromStatus: report.status,
          toStatus: newStatus,
          departmentName: report.departments?.name || '',
          reportType: reportType,
          authorId: report.author_id,
        }),
      ])

      // 쿼리 캐시 무효화 → 자동 refetch
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      setComment('')
    } catch (error) {
      console.error(error)
      // 실패 시 모달 다시 열기
      setShowApprovalModal(true)
    } finally {
      setLoading(false)
    }
  }

  let parsedNotes: Record<string, any> = {}
  try {
    parsedNotes = report.notes ? JSON.parse(report.notes) : {}
  } catch {
    parsedNotes = {}
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{typeConfig.icon}</span>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                {reportType === 'weekly'
                  ? getDeptDisplayName()
                  : report.meeting_title || getDeptDisplayName()}
              </h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(report.report_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
              {reportType === 'weekly' && report.week_number && ` (${report.week_number}주차)`}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              작성자: {report.users?.name}
              {reportType !== 'weekly' && report.departments?.name && ` · ${report.departments.name}`}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* 관리자 삭제 버튼 */}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                title="삭제"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {/* 제출 취소 버튼 (작성자 + submitted 상태일 때만) */}
            {canCancelSubmission && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors"
                title="제출 취소"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
            {/* 수정 버튼 (작성자 + draft/rejected 상태일 때) */}
            {currentUser?.id === report.author_id && ['draft', 'rejected'].includes(report.status) && (
              <button
                onClick={() => router.push(`/reports/${report.id}/edit`)}
                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                title="수정"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowPrintOptions(true)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
              title="인쇄"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              onClick={() => router.back()}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모임/교육 개요 (주차 보고서가 아닐 때) */}
      {reportType !== 'weekly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm lg:text-base">
            {reportType === 'meeting' ? '모임 개요' : '교육 개요'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">일시</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(report.report_date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">장소</p>
              <p className="text-sm font-medium text-gray-900">{report.meeting_location || '-'}</p>
            </div>
            <div className="col-span-2 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">참석자</p>
              <p className="text-sm font-medium text-gray-900">{report.attendees || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 진행 순서 */}
      {programs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">진행순서</h2>
          <div className="space-y-2">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-xl"
              >
                <span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded shrink-0">
                  {program.start_time.slice(0, 5)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{program.content}</p>
                  {program.person_in_charge && (
                    <p className="text-xs text-gray-500 mt-0.5">{program.person_in_charge}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주요내용/교육내용 (모임/교육 보고서) */}
      {reportType !== 'weekly' && report.main_content && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">
            {reportType === 'meeting' ? '주요내용' : '교육내용'}
          </h2>
          <div className="bg-gray-50 p-4 rounded-xl">
            <div
              className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: report.main_content }}
            />
          </div>
        </div>
      )}

      {/* 출결 현황 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">출결 현황</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center py-4 px-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">재적</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{report.total_registered}</p>
            </div>
            <div className="text-center py-4 px-2 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 mb-1">예배</p>
              <p className="text-2xl lg:text-3xl font-bold text-blue-700">{report.worship_attendance}</p>
            </div>
            <div className="text-center py-4 px-2 bg-green-50 rounded-xl">
              <p className="text-xs text-green-600 mb-1">모임</p>
              <p className="text-2xl lg:text-3xl font-bold text-green-700">{report.meeting_attendance}</p>
            </div>
          </div>
        </div>
      )}

      {/* 새신자 명단 (주차 보고서만) */}
      {reportType === 'weekly' && newcomers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">새신자 명단</h2>
          <div className="space-y-3">
            {newcomers.map((newcomer) => (
              <div key={newcomer.id} className="p-3 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-900">{newcomer.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {newcomer.phone && <span>연락처: {newcomer.phone}</span>}
                  {newcomer.introducer && <span>인도자: {newcomer.introducer}</span>}
                  {newcomer.affiliation && <span>소속: {newcomer.affiliation}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 논의사항/적용점 및 기타사항 */}
      {(parsedNotes.discussion_notes || parsedNotes.other_notes || report.application_notes) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">
            {reportType === 'education' ? '적용점 및 기타사항' : '논의 및 기타사항'}
          </h2>
          <div className="space-y-4">
            {reportType === 'education' && report.application_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">적용점</p>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div
                    className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: report.application_notes }}
                  />
                </div>
              </div>
            )}
            {parsedNotes.discussion_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">논의사항</p>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div
                    className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: parsedNotes.discussion_notes }}
                  />
                </div>
              </div>
            )}
            {parsedNotes.other_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">기타사항</p>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div
                    className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: parsedNotes.other_notes }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 반려 안내 (작성자에게만 표시) */}
      {report.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800 text-sm lg:text-base">보고서가 반려되었습니다</h3>
              {(report as any).rejection_reason && (
                <div className="mt-2 p-3 bg-white/70 rounded-xl">
                  <p className="text-xs text-red-600 font-medium mb-1">반려 사유</p>
                  <p className="text-sm text-red-700">{(report as any).rejection_reason}</p>
                </div>
              )}
              {currentUser?.id === report.author_id && (
                <div className="mt-3">
                  <p className="text-xs text-red-600 mb-2">수정 후 다시 제출할 수 있습니다.</p>
                  <button
                    onClick={() => router.push(`/reports/${report.id}/edit`)}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 active:bg-red-800 transition-colors"
                  >
                    수정 후 재제출
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 결재 진행 상태 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm lg:text-base">결재 진행 현황</h2>

        {/* 모바일: 세로 타임라인 */}
        <div className="lg:hidden">
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              <ApprovalStepVertical
                label="팀장 제출"
                status={report.status !== 'draft' ? 'completed' : 'pending'}
                name={report.users?.name}
                date={report.submitted_at}
              />
              <ApprovalStepVertical
                label="회장 협조"
                status={
                  ['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status)
                    ? 'completed'
                    : report.status === 'submitted'
                    ? 'current'
                    : 'pending'
                }
                name={report.coordinator?.name}
                date={report.coordinator_reviewed_at}
              />
              <ApprovalStepVertical
                label="부장 결재"
                status={
                  ['manager_approved', 'final_approved'].includes(report.status)
                    ? 'completed'
                    : report.status === 'coordinator_reviewed'
                    ? 'current'
                    : 'pending'
                }
                name={report.manager?.name}
                date={report.manager_approved_at}
              />
              <ApprovalStepVertical
                label="목사 확인"
                status={
                  report.status === 'final_approved'
                    ? 'completed'
                    : report.status === 'manager_approved'
                    ? 'current'
                    : 'pending'
                }
                name={report.final_approver?.name}
                date={report.final_approved_at}
              />
            </div>
          </div>
        </div>

        {/* 데스크탑: 가로 레이아웃 */}
        <div className="hidden lg:flex items-center justify-between">
          <ApprovalStep
            label="팀장 제출"
            status={report.status !== 'draft' ? 'completed' : 'pending'}
            name={report.users?.name}
            date={report.submitted_at}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-3">
            <div
              className={`h-full bg-blue-500 transition-all ${
                ['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status)
                  ? 'w-full'
                  : report.status === 'submitted'
                  ? 'w-1/2'
                  : 'w-0'
              }`}
            />
          </div>
          <ApprovalStep
            label="회장 협조"
            status={
              ['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status)
                ? 'completed'
                : report.status === 'submitted'
                ? 'current'
                : 'pending'
            }
            name={report.coordinator?.name}
            date={report.coordinator_reviewed_at}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-3">
            <div
              className={`h-full bg-blue-500 transition-all ${
                ['manager_approved', 'final_approved'].includes(report.status)
                  ? 'w-full'
                  : report.status === 'coordinator_reviewed'
                  ? 'w-1/2'
                  : 'w-0'
              }`}
            />
          </div>
          <ApprovalStep
            label="부장 결재"
            status={
              ['manager_approved', 'final_approved'].includes(report.status)
                ? 'completed'
                : report.status === 'coordinator_reviewed'
                ? 'current'
                : 'pending'
            }
            name={report.manager?.name}
            date={report.manager_approved_at}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-3">
            <div
              className={`h-full bg-blue-500 transition-all ${
                report.status === 'final_approved'
                  ? 'w-full'
                  : report.status === 'manager_approved'
                  ? 'w-1/2'
                  : 'w-0'
              }`}
            />
          </div>
          <ApprovalStep
            label="목사 확인"
            status={
              report.status === 'final_approved'
                ? 'completed'
                : report.status === 'manager_approved'
                ? 'current'
                : 'pending'
            }
            name={report.final_approver?.name}
            date={report.final_approved_at}
          />
        </div>

        {/* 결재 버튼 */}
        {canApprove && (
          <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
            <button
              onClick={() => {
                setApprovalAction('reject')
                setShowApprovalModal(true)
              }}
              className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 active:bg-red-100 transition-colors text-sm lg:text-base"
            >
              반려
            </button>
            <button
              onClick={() => {
                setApprovalAction('approve')
                setShowApprovalModal(true)
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm lg:text-base"
            >
              {canApprove === 'coordinator' && '협조'}
              {canApprove === 'manager' && '결재'}
              {canApprove === 'final' && '확인'}
            </button>
          </div>
        )}
      </div>

      {/* 결재 이력 */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">결재 이력</h2>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{item.users?.name}</span>
                    <StatusBadge status={item.to_status} />
                  </div>
                  {item.comment && (
                    <p className="text-xs text-gray-500 mt-1">{item.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 결재 모달 */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md p-5 lg:p-6 animate-slide-up lg:animate-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? '결재 승인' : '반려'}
            </h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'approve' ? '코멘트 (선택)' : '반려 사유를 입력하세요'}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-base"
              required={approvalAction === 'reject'}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleApproval}
                disabled={loading || (approvalAction === 'reject' && !comment)}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                }`}
              >
                {loading ? '처리 중...' : approvalAction === 'approve' ? '승인' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 제출 취소 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">제출 취소</h3>
              <p className="text-gray-500 text-sm mb-6">
                보고서 제출을 취소하시겠습니까?<br />
                <span className="text-gray-400">취소 후 수정하여 다시 제출할 수 있습니다.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                닫기
              </button>
              <button
                onClick={handleCancelSubmission}
                disabled={loading}
                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {loading ? '처리 중...' : '제출 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 보고서 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">보고서 삭제</h3>
              <p className="text-gray-500 text-sm mb-6">
                이 보고서를 삭제하시겠습니까?<br />
                <span className="text-red-500 font-medium">삭제된 보고서는 복구할 수 없습니다.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인쇄 옵션 모달 */}
      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md p-5 lg:p-6 animate-slide-up lg:animate-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">인쇄 옵션</h3>
              <button
                onClick={() => setShowPrintOptions(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handlePrint()}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">기본 인쇄</p>
                  <p className="text-sm text-gray-500">시스템 프린터로 인쇄</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">네트워크 프린터</p>
                    <p className="text-xs text-gray-500">IP 주소로 무선 프린터 연결</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="192.168.0.100"
                    value={printerIP}
                    onChange={(e) => setPrinterIP(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() => {
                      if (printerIP) {
                        localStorage.setItem('printerIP', printerIP)
                        handlePrint(printerIP)
                      }
                    }}
                    disabled={!printerIP}
                    className="px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    인쇄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 주차 보고서 인쇄 HTML 생성
function generateWeeklyPrintHTML(
  deptName: string,
  report: any,
  reportDate: Date,
  programRows: string,
  attendanceRows: string,
  newcomerRows: string,
  parsedNotes: any
) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${deptName}_${report.year}년_${report.week_number}주차_보고서</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      padding: 15mm 15mm 10mm 15mm;
      color: #000;
    }
    table { border-collapse: collapse; }
    .cell {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: center;
      vertical-align: middle;
    }
    .section-header {
      background: linear-gradient(135deg, #d4e5f7 0%, #e8f0f8 100%);
      font-weight: bold;
      text-align: center;
      padding: 8px;
      border: 1px solid #000;
    }
    .approval-box { border: 1px solid #000; }
    .approval-box td { border: 1px solid #000; padding: 4px 10px; text-align: center; }
    .approval-box .label { background: #f0f0f0; font-weight: bold; }
    .approval-box .sign-area { height: 45px; min-width: 70px; }
  </style>
</head>
<body>
<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
  <table class="approval-box" style="font-size:9pt;">
    <tr>
      <td rowspan="2" class="label" style="width:40px;">결재</td>
      <td style="width:100px;text-align:center;">작성자</td>
      <td style="width:100px;text-align:center;">부장</td>
    </tr>
    <tr>
      <td class="sign-area" style="height:50px;"></td>
      <td class="sign-area" style="height:50px;text-align:left;padding-left:8px;">강현숙</td>
    </tr>
    <tr>
      <td class="label">협조</td>
      <td style="text-align:left;padding-left:8px;height:30px;">신요한</td>
      <td style="text-align:left;padding-left:8px;height:30px;">전홍균</td>
    </tr>
  </table>
</div>
<div style="text-align:center;margin-bottom:20px;">
  <div style="font-size:20pt;font-weight:bold;color:#000;">${deptName} 주차 보고서</div>
  <div style="font-size:12pt;margin-top:8px;">${reportDate.getFullYear()}년 ${reportDate.getMonth() + 1}월 ${reportDate.getDate()}일(제 ${report.week_number}주)</div>
</div>
<table style="width:100%;margin-bottom:12px;">
  <tr><td class="section-header" colspan="4">진행순서</td></tr>
  <tr style="background:#f5f5f5;">
    <td class="cell" style="width:120px;font-weight:bold;">시간</td>
    <td class="cell" style="font-weight:bold;">내용</td>
    <td class="cell" style="width:70px;font-weight:bold;">담당</td>
    <td class="cell" style="width:70px;font-weight:bold;">비고</td>
  </tr>
  ${programRows}
</table>
<table style="width:100%;margin-bottom:12px;">
  <tr><td class="section-header" colspan="5">출결상황</td></tr>
  <tr style="background:#f5f5f5;">
    <td class="cell" rowspan="2" style="width:100px;font-weight:bold;">구분(셀)</td>
    <td class="cell" rowspan="2" style="width:60px;font-weight:bold;">재적</td>
    <td class="cell" colspan="2" style="font-weight:bold;">출석</td>
    <td class="cell" rowspan="2" style="font-weight:bold;">참고사항</td>
  </tr>
  <tr style="background:#f5f5f5;">
    <td class="cell" style="width:60px;font-weight:bold;">예배</td>
    <td class="cell" style="width:60px;font-weight:bold;">CU</td>
  </tr>
  ${attendanceRows}
  <tr style="background:#e6f0ff;">
    <td class="cell" style="font-weight:bold;">합계</td>
    <td class="cell" style="font-weight:bold;">${report.total_registered}</td>
    <td class="cell" style="font-weight:bold;">${report.worship_attendance}</td>
    <td class="cell" style="font-weight:bold;">${report.meeting_attendance}</td>
    <td class="cell"></td>
  </tr>
</table>
<table style="width:100%;margin-bottom:12px;">
  <tr><td class="section-header" colspan="6">새신자 명단</td></tr>
  <tr style="background:#f5f5f5;">
    <td class="cell" style="width:60px;font-weight:bold;">이름</td>
    <td class="cell" style="width:90px;font-weight:bold;">연락처</td>
    <td class="cell" style="width:80px;font-weight:bold;">생년월일</td>
    <td class="cell" style="width:60px;font-weight:bold;">인도자</td>
    <td class="cell" style="font-weight:bold;">주소</td>
    <td class="cell" style="width:80px;font-weight:bold;">소속(직업)</td>
  </tr>
  ${newcomerRows}
</table>
<table style="width:100%;">
  <tr>
    <td class="section-header" style="width:50%;">논의(특이)사항</td>
    <td class="section-header" style="width:50%;">기타사항</td>
  </tr>
  <tr>
    <td class="cell" style="height:120px;vertical-align:top;text-align:left;padding:10px;white-space:pre-wrap;line-height:1.6;">
${parsedNotes.discussion_notes ? parsedNotes.discussion_notes.split('\\n').map((line: string) => 'ㆍ ' + line).join('\\n') : 'ㆍ\\nㆍ\\nㆍ'}
    </td>
    <td class="cell" style="height:120px;vertical-align:top;text-align:left;padding:10px;white-space:pre-wrap;line-height:1.6;">
${parsedNotes.other_notes ? parsedNotes.other_notes.split('\\n').map((line: string) => 'ㆍ ' + line).join('\\n') : 'ㆍ\\nㆍ\\nㆍ'}
    </td>
  </tr>
</table>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };</script>
</body>
</html>`
}

// 모임/교육 보고서 인쇄 HTML 생성
function generateMeetingPrintHTML(
  reportType: string,
  title: string,
  report: any,
  reportDate: Date,
  programRows: string,
  parsedNotes: any
) {
  const isEducation = reportType === 'education'
  const typeLabel = isEducation ? '교육보고서' : '보고서'
  const leftLabel = isEducation ? '적용점' : '논의사항'
  const leftContent = isEducation
    ? (report.application_notes || '')
    : (parsedNotes.discussion_notes || '')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}_${typeLabel}</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      padding: 15mm 15mm 10mm 15mm;
      color: #000;
    }
    table { border-collapse: collapse; }
    .cell {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: center;
      vertical-align: middle;
    }
    .section-header {
      background: linear-gradient(135deg, #d4e5f7 0%, #e8f0f8 100%);
      font-weight: bold;
      text-align: center;
      padding: 8px;
      border: 1px solid #000;
    }
    .approval-box { border: 1px solid #000; }
    .approval-box td { border: 1px solid #000; padding: 4px 10px; text-align: center; }
    .approval-box .label { background: #f0f0f0; font-weight: bold; }
    .approval-box .sign-area { height: 45px; min-width: 70px; }
  </style>
</head>
<body>
<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
  <table class="approval-box" style="font-size:9pt;">
    <tr>
      <td rowspan="2" class="label" style="width:40px;">결재</td>
      <td style="width:100px;text-align:center;">작성자</td>
      <td style="width:100px;text-align:center;">부장</td>
    </tr>
    <tr>
      <td class="sign-area" style="height:50px;"></td>
      <td class="sign-area" style="height:50px;text-align:left;padding-left:8px;">강현숙</td>
    </tr>
    <tr>
      <td class="label">협조</td>
      <td style="text-align:left;padding-left:8px;height:30px;">신요한</td>
      <td style="text-align:left;padding-left:8px;height:30px;">전홍균</td>
    </tr>
  </table>
</div>
<div style="text-align:center;margin-bottom:20px;">
  <div style="font-size:20pt;font-weight:bold;color:#000;">[ ${title} ] ${typeLabel}</div>
</div>
<table style="width:100%;margin-bottom:12px;">
  <tr>
    <td class="section-header" colspan="4">${isEducation ? '교육' : '모임'} 개요</td>
  </tr>
  <tr>
    <td class="cell" style="width:80px;background:#f5f5f5;font-weight:bold;">일 시</td>
    <td class="cell">${reportDate.getFullYear()}. ${reportDate.getMonth() + 1}. ${reportDate.getDate()}.</td>
    <td class="cell" style="width:60px;background:#f5f5f5;font-weight:bold;">장소</td>
    <td class="cell">${report.meeting_location || ''}</td>
  </tr>
  <tr>
    <td class="cell" style="background:#f5f5f5;font-weight:bold;">참 석 자</td>
    <td class="cell" colspan="3" style="text-align:left;">${report.attendees || ''}</td>
  </tr>
</table>
<table style="width:100%;margin-bottom:12px;">
  <tr><td class="section-header" colspan="4">진행순서</td></tr>
  <tr style="background:#f5f5f5;">
    <td class="cell" style="width:100px;font-weight:bold;">시간</td>
    <td class="cell" style="font-weight:bold;">내용</td>
    <td class="cell" style="width:70px;font-weight:bold;">담당</td>
    <td class="cell" style="width:70px;font-weight:bold;">비고</td>
  </tr>
  ${programRows}
</table>
${report.main_content ? `
<table style="width:100%;margin-bottom:12px;">
  <tr><td class="section-header">${isEducation ? '교 육 명' : '주요내용'}</td></tr>
  <tr>
    <td class="cell" style="min-height:80px;vertical-align:top;text-align:left;padding:10px;white-space:pre-wrap;line-height:1.6;">
ㆍ ${report.main_content}
    </td>
  </tr>
</table>
` : ''}
<table style="width:100%;">
  <tr>
    <td class="section-header" style="width:50%;">${leftLabel}</td>
    <td class="section-header" style="width:50%;">기타사항</td>
  </tr>
  <tr>
    <td class="cell" style="min-height:120px;vertical-align:top;text-align:left;padding:10px;white-space:pre-wrap;line-height:1.6;">
${leftContent ? leftContent.split('\\n').map((line: string) => 'ㆍ ' + line).join('\\n') : 'ㆍ\\nㆍ\\nㆍ'}
    </td>
    <td class="cell" style="min-height:120px;vertical-align:top;text-align:left;padding:10px;white-space:pre-wrap;line-height:1.6;">
${parsedNotes.other_notes ? parsedNotes.other_notes.split('\\n').map((line: string) => 'ㆍ ' + line).join('\\n') : 'ㆍ\\nㆍ\\nㆍ'}
    </td>
  </tr>
</table>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };</script>
</body>
</html>`
}

// 데스크탑용 가로 단계
function ApprovalStep({
  label,
  status,
  name,
  date,
}: {
  label: string
  status: 'pending' | 'current' | 'completed'
  name?: string | null
  date?: string | null
}) {
  return (
    <div className="text-center shrink-0">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
          status === 'completed'
            ? 'bg-blue-500 text-white'
            : status === 'current'
            ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'completed' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-2 h-2 bg-current rounded-full" />
        )}
      </div>
      <p className="text-xs font-medium text-gray-900">{label}</p>
      {name && <p className="text-xs text-gray-500 mt-0.5">{name}</p>}
      {date && (
        <p className="text-xs text-gray-400">
          {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  )
}

// 모바일용 세로 타임라인 단계
function ApprovalStepVertical({
  label,
  status,
  name,
  date,
}: {
  label: string
  status: 'pending' | 'current' | 'completed'
  name?: string | null
  date?: string | null
}) {
  return (
    <div className="flex items-start gap-4 relative">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
          status === 'completed'
            ? 'bg-blue-500 text-white'
            : status === 'current'
            ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'completed' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-1.5 h-1.5 bg-current rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600' : 'text-gray-900'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {name ? (
            <>
              <span>{name}</span>
              {date && (
                <>
                  <span>·</span>
                  <span>{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-400">
              {status === 'pending' ? '대기중' : status === 'current' ? '진행중' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: '작성중', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: '제출됨', className: 'bg-yellow-100 text-yellow-700' },
    coordinator_reviewed: { label: '회장검토', className: 'bg-blue-100 text-blue-700' },
    manager_approved: { label: '부장결재', className: 'bg-purple-100 text-purple-700' },
    final_approved: { label: '승인완료', className: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', className: 'bg-red-100 text-red-700' },
    revision_requested: { label: '수정요청', className: 'bg-orange-100 text-orange-700' },
  }

  const { label, className } = config[status] || config.draft

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
