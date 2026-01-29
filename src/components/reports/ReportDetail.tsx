'use client'

import { useState, useCallback } from 'react'
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
    if (code === 'cu1') return 'CU 1청년'
    if (code === 'cu2') return 'CU 2청년'
    if (code === 'youth') return '청소년부'
    if (code === 'ck') return 'CK'
    return report.departments?.name || ''
  }, [report.departments])

  // 날짜 포맷
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }, [])

  const handlePrint = useCallback(() => {
    const parsedNotes = report.notes ? JSON.parse(report.notes) : {}
    const cellAttendance = parsedNotes.cell_attendance || []
    const reportDate = new Date(report.report_date)

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('팝업 차단을 해제해주세요.')
      return
    }

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

    printWindow.document.write(html)
    printWindow.document.close()
  }, [report, programs, newcomers, getDeptDisplayName, formatDate])

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {report.departments?.name}
            </h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-gray-500">
            {new Date(report.report_date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            {' · '}
            작성자: {report.users?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            인쇄
          </button>
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 결재 진행 상태 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">결재 진행 현황</h2>
        <div className="flex items-center justify-between">
          <ApprovalStep
            label="팀장 제출"
            status={report.status !== 'draft' ? 'completed' : 'pending'}
            name={report.users?.name}
            date={report.submitted_at}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-2">
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
          <div className="flex-1 h-1 bg-gray-200 mx-2">
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
          <div className="flex-1 h-1 bg-gray-200 mx-2">
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
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => {
                setApprovalAction('reject')
                setShowApprovalModal(true)
              }}
              className="flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
            >
              반려
            </button>
            <button
              onClick={() => {
                setApprovalAction('approve')
                setShowApprovalModal(true)
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {canApprove === 'coordinator' && '협조'}
              {canApprove === 'manager' && '결재'}
              {canApprove === 'final' && '확인'}
            </button>
          </div>
        )}
      </div>

      {/* 출결 현황 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">출결 현황</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">재적</p>
            <p className="text-2xl font-bold text-gray-900">{report.total_registered}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-600">예배 출석</p>
            <p className="text-2xl font-bold text-blue-700">{report.worship_attendance}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-600">모임 출석</p>
            <p className="text-2xl font-bold text-green-700">{report.meeting_attendance}</p>
          </div>
        </div>
      </div>

      {/* 진행 순서 */}
      {programs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">진행 순서</h2>
          <div className="space-y-3">
            {programs.map((program) => (
              <div key={program.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-mono text-gray-500 w-16">
                  {program.start_time.slice(0, 5)}
                </span>
                <span className="flex-1 font-medium text-gray-900">{program.content}</span>
                <span className="text-sm text-gray-500">{program.person_in_charge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새신자 명단 */}
      {newcomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">새신자 명단</h2>
          <div className="space-y-3">
            {newcomers.map((newcomer) => (
              <div key={newcomer.id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{newcomer.name}</p>
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  {newcomer.phone && <p>연락처: {newcomer.phone}</p>}
                  {newcomer.introducer && <p>인도자: {newcomer.introducer}</p>}
                  {newcomer.affiliation && <p>소속: {newcomer.affiliation}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 논의 및 기타사항 */}
      {report.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">논의 및 기타사항</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
        </div>
      )}

      {/* 결재 이력 */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">결재 이력</h2>
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="text-gray-900">
                    <span className="font-medium">{item.users?.name}</span>
                    {' - '}
                    <StatusBadge status={item.to_status} />
                  </p>
                  {item.comment && (
                    <p className="text-sm text-gray-500 mt-1">{item.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? '결재 승인' : '반려'}
            </h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'approve' ? '코멘트 (선택)' : '반려 사유를 입력하세요'}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              required={approvalAction === 'reject'}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleApproval}
                disabled={loading || (approvalAction === 'reject' && !comment)}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {loading ? '처리 중...' : approvalAction === 'approve' ? '승인' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

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
    <div className="text-center">
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: '작성 중', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: '제출됨', className: 'bg-yellow-100 text-yellow-700' },
    coordinator_reviewed: { label: '회장 검토', className: 'bg-blue-100 text-blue-700' },
    manager_approved: { label: '부장 결재', className: 'bg-purple-100 text-purple-700' },
    final_approved: { label: '승인 완료', className: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', className: 'bg-red-100 text-red-700' },
    revision_requested: { label: '수정 요청', className: 'bg-orange-100 text-orange-700' },
  }

  const { label, className } = config[status] || config.draft

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
