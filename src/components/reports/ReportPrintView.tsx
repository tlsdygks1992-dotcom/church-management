'use client'

import { forwardRef } from 'react'

interface ReportData {
  id: string
  department_name: string
  department_code: string
  report_date: string
  week_number: number
  year: number
  author_name: string
  total_registered: number
  worship_attendance: number
  meeting_attendance: number
  notes: string | null
  status: string
  programs: Array<{
    start_time: string
    content: string
    person_in_charge: string
  }>
  newcomers: Array<{
    name: string
    phone: string | null
    birth_date: string | null
    introducer: string | null
    address: string | null
    affiliation: string | null
  }>
}

interface ReportPrintViewProps {
  report: ReportData
}

const ReportPrintView = forwardRef<HTMLDivElement, ReportPrintViewProps>(
  ({ report }, ref) => {
    const parsedNotes = report.notes ? JSON.parse(report.notes) : {}
    const cellAttendance = parsedNotes.cell_attendance || []

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    }

    const getDeptDisplayName = () => {
      if (report.department_code === 'ck') return '유치부/아동부'
      if (report.department_code === 'cu_worship') return 'CU워십'
      if (report.department_code === 'youth') return '청소년부'
      if (report.department_code === 'cu1') return '1청년'
      if (report.department_code === 'cu2') return '2청년'
      return report.department_name
    }

    return (
      <div ref={ref} className="print-container bg-white p-8 max-w-[210mm] mx-auto text-sm">
        <style jsx>{`
          @media print {
            .print-container {
              padding: 10mm;
              font-size: 10pt;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}</style>

        {/* 결재란 - 우측 상단 */}
        <div className="flex justify-end mb-4">
          <table className="border-collapse border border-gray-800 text-xs">
            <tbody>
              <tr>
                <td rowSpan={2} className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold text-center w-12">
                  결재
                </td>
                <td className="border border-gray-800 px-3 py-1 text-center w-20">작성자</td>
                <td className="border border-gray-800 px-3 py-1 text-center w-20">부장</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-3 py-4 text-center h-12"></td>
                <td className="border border-gray-800 px-3 py-4 text-center h-12">강현숙</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-2 py-1 bg-gray-100 font-bold text-center">협조</td>
                <td className="border border-gray-800 px-3 py-1 text-center">신요한</td>
                <td className="border border-gray-800 px-3 py-1 text-center">전홍균</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 헤더 - 로고 및 제목 */}
        <div className="flex items-center gap-4 mb-6 border-b-2 border-blue-600 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">청파중앙교회</p>
              <p className="text-xs text-gray-500">Cheongpa Joongang Church</p>
            </div>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900">
              {getDeptDisplayName()} 주차 보고서
            </h1>
            <p className="text-gray-600 mt-1">
              {formatDate(report.report_date)} (제 {report.week_number}주)
            </p>
          </div>
        </div>

        {/* 진행순서 */}
        <div className="mb-6">
          <div className="bg-yellow-100 px-3 py-1 font-bold text-gray-900 border border-gray-400">
            진행순서
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 px-3 py-2 text-center w-32">시간</th>
                <th className="border border-gray-400 px-3 py-2 text-center">내용</th>
                <th className="border border-gray-400 px-3 py-2 text-center w-24">담당</th>
                <th className="border border-gray-400 px-3 py-2 text-center w-24">비고</th>
              </tr>
            </thead>
            <tbody>
              {report.programs.length > 0 ? (
                report.programs.map((program, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-3 py-2 text-center">
                      {program.start_time}
                    </td>
                    <td className="border border-gray-400 px-3 py-2">
                      {program.content}
                      {parsedNotes.sermon_title && program.content.includes('말씀') && (
                        <span className="text-gray-600"> [{parsedNotes.sermon_title} {parsedNotes.sermon_scripture}]</span>
                      )}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-center">
                      {program.person_in_charge}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-center"></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="border border-gray-400 px-3 py-4 text-center text-gray-500">
                    -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 출결상황 */}
        <div className="mb-6">
          <div className="bg-yellow-100 px-3 py-1 font-bold text-gray-900 border border-gray-400">
            출결상황
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 px-3 py-2 text-center" rowSpan={2}>구분(셀)</th>
                <th className="border border-gray-400 px-3 py-2 text-center w-16" rowSpan={2}>재적</th>
                <th className="border border-gray-400 px-3 py-2 text-center" colSpan={2}>출석</th>
                <th className="border border-gray-400 px-3 py-2 text-center" rowSpan={2}>참고사항</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 px-2 py-1 text-center w-16">예배</th>
                <th className="border border-gray-400 px-2 py-1 text-center w-16">CU</th>
              </tr>
            </thead>
            <tbody>
              {cellAttendance.length > 0 && cellAttendance.some((c: any) => c.cell_name) ? (
                cellAttendance.map((cell: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-3 py-2">{cell.cell_name || '-'}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{cell.registered || '-'}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{cell.worship || '-'}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{cell.meeting || '-'}</td>
                    <td className="border border-gray-400 px-3 py-2">{cell.note || ''}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{report.total_registered}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{report.worship_attendance}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{report.meeting_attendance}</td>
                  <td className="border border-gray-400 px-3 py-2"></td>
                </tr>
              )}
              <tr className="bg-blue-50 font-medium">
                <td className="border border-gray-400 px-3 py-2 text-center">합계</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{report.total_registered}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{report.worship_attendance}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{report.meeting_attendance}</td>
                <td className="border border-gray-400 px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 새신자 명단 */}
        <div className="mb-6">
          <div className="bg-yellow-100 px-3 py-1 font-bold text-gray-900 border border-gray-400">
            새신자 명단
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-400 px-2 py-2 text-center w-20">이름</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-28">연락처</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-24">생년월일</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-20">인도자</th>
                <th className="border border-gray-400 px-2 py-2 text-center">주소</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-24">소속(직업)</th>
              </tr>
            </thead>
            <tbody>
              {report.newcomers.length > 0 ? (
                report.newcomers.map((newcomer, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-2 py-2 text-center">{newcomer.name}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{newcomer.phone || '-'}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{newcomer.birth_date || '-'}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{newcomer.introducer || '-'}</td>
                    <td className="border border-gray-400 px-2 py-2">{newcomer.address || '-'}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{newcomer.affiliation || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-gray-400 px-3 py-4 text-center text-gray-500">
                    -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 논의사항 / 기타사항 */}
        <div className="grid grid-cols-2 gap-0">
          <div>
            <div className="bg-yellow-100 px-3 py-1 font-bold text-gray-900 border border-gray-400">
              논의(특이)사항
            </div>
            <div className="border border-gray-400 border-t-0 p-3 min-h-[120px] whitespace-pre-wrap">
              {parsedNotes.discussion_notes ? (
                parsedNotes.discussion_notes.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-1">{line || '\u00A0'}</p>
                ))
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
          </div>
          <div>
            <div className="bg-yellow-100 px-3 py-1 font-bold text-gray-900 border border-gray-400 border-l-0">
              기타사항
            </div>
            <div className="border border-gray-400 border-t-0 border-l-0 p-3 min-h-[120px] whitespace-pre-wrap">
              {parsedNotes.other_notes ? (
                parsedNotes.other_notes.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-1">{line || '\u00A0'}</p>
                ))
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ReportPrintView.displayName = 'ReportPrintView'

export default ReportPrintView
