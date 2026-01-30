'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyReport, ReportProgram, Newcomer, ApprovalHistory, User } from '@/types/database'

interface ReportDetailProps {
  report: WeeklyReport & {
    departments: { name: string; code?: string } | null
    users: { name: string } | null
    coordinator: { name: string } | null
    manager: { name: string } | null
    final_approver: { name: string } | null
  }
  programs: ReportProgram[]
  newcomers: Newcomer[]
  history: (ApprovalHistory & { users: { name: string } | null })[]
  currentUser: User | null
  canApprove: string | null
}

export default function ReportDetail({
  report,
  programs,
  newcomers,
  history,
  currentUser,
  canApprove,
}: ReportDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')

  // 부서명 표시
  const getDeptDisplayName = useCallback(() => {
    const code = report.departments?.code
    if (code === 'ck') return '유치부/아동부'
    if (code === 'cu_worship') return 'CU워십'
    if (code === 'youth') return '청소년부'
    if (code === 'cu1') return '1청년'
    if (code === 'cu2') return '2청년'
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
    const parsedNotes = report.notes ? JSON.parse(report.notes) : {}
    const cellAttendance = parsedNotes.cell_attendance || []
    const reportDate = new Date(report.report_date)

    // 진행순서 행 생성
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

    // 출결상황 행 생성
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
      // 빈 행 3개
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

    // 새신자 행 생성
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

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${getDeptDisplayName()}_${report.year}년_${report.week_number}주차_보고서</title>
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

<!-- 결재란 (우측 상단) -->
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

<!-- 헤더 (제목만 가운데) -->
<div style="text-align:center;margin-bottom:20px;">
  <div style="font-size:20pt;font-weight:bold;color:#000;">${getDeptDisplayName()} 주차 보고서</div>
  <div style="font-size:12pt;margin-top:8px;">${reportDate.getFullYear()}년 ${reportDate.getMonth() + 1}월 ${reportDate.getDate()}일(제 ${report.week_number}주)</div>
</div>

<!-- 진행순서 -->
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

<!-- 출결상황 -->
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

<!-- 새신자 명단 -->
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

<!-- 논의(특이)사항 / 기타사항 -->
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

    // 모바일/데스크탑 호환 인쇄 방식
    // iframe을 사용하여 팝업 차단 우회
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

          // 인쇄 후 iframe 제거
          setTimeout(() => {
            document.body.removeChild(printFrame)
          }, 1000)
        }, 250)
      }
    }

    setShowPrintOptions(false)
  }, [report, programs, newcomers, getDeptDisplayName])

  const handleApproval = async () => {
    if (!canApprove || !currentUser) return
    setLoading(true)

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

      // 보고서 업데이트
      await supabase
        .from('weekly_reports')
        .update({ ...updateData, status: newStatus })
        .eq('id', report.id)

      // 결재 이력 추가
      await supabase.from('approval_history').insert({
        report_id: report.id,
        approver_id: currentUser.id,
        from_status: report.status,
        to_status: newStatus,
        comment,
      })

      setShowApprovalModal(false)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // notes에서 실제 내용 파싱
  const parsedNotes = report.notes ? JSON.parse(report.notes) : {}

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      {/* 헤더 - 뒤로가기 포함 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                {report.departments?.name}
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
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              작성자: {report.users?.name}
            </p>
          </div>

          <div className="flex items-center gap-1">
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

      {/* 결재 진행 상태 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm lg:text-base">결재 진행 현황</h2>

        {/* 모바일/태블릿: 세로 타임라인 */}
        <div className="lg:hidden">
          <div className="relative">
            {/* 연결선 */}
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

      {/* 출결 현황 - 카드형 */}
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

      {/* 진행 순서 */}
      {programs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">진행 순서</h2>
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

      {/* 새신자 명단 */}
      {newcomers.length > 0 && (
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

      {/* 논의 및 기타사항 */}
      {(parsedNotes.discussion_notes || parsedNotes.other_notes) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">논의 및 기타사항</h2>
          <div className="space-y-4">
            {parsedNotes.discussion_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">논의사항</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl">
                  {parsedNotes.discussion_notes}
                </p>
              </div>
            )}
            {parsedNotes.other_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">기타사항</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl">
                  {parsedNotes.other_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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
              {/* 기본 인쇄 */}
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

              {/* 네트워크 프린터 */}
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
                        // 프린터 IP 저장
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
                <p className="text-xs text-gray-400 mt-2">
                  * 프린터 IP는 기기 설정에서 확인하세요
                </p>
              </div>

              {/* 도움말 */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong>모바일 무선 인쇄 방법:</strong><br/>
                  1. 기기 설정 → 프린터 추가<br/>
                  2. 프린터 IP 주소 입력 (예: 192.168.0.100)<br/>
                  3. &apos;기본 인쇄&apos; 선택 후 프린터 지정
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
