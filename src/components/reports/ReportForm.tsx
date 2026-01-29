'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Department {
  id: string
  name: string
  code: string
}

interface ReportFormProps {
  departments: Department[]
  defaultDate: string
  weekNumber: number
  authorId: string
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

// 5분 단위 시간 옵션 생성
function generateTimeOptions() {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
}

export default function ReportForm({
  departments,
  defaultDate,
  weekNumber,
  authorId,
}: ReportFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    department_id: departments[0]?.id || '',
    report_date: defaultDate,
    sermon_title: '',
    sermon_scripture: '',
    discussion_notes: '',
    other_notes: '',
  })

  const [programs, setPrograms] = useState<Program[]>([
    { start_time: '13:30', end_time: '13:40', content: '찬양 및 기도', person_in_charge: '', note: '', order_index: 0 },
    { start_time: '13:40', end_time: '14:00', content: '말씀', person_in_charge: '', note: '', order_index: 1 },
    { start_time: '14:00', end_time: '14:10', content: '광고', person_in_charge: '', note: '', order_index: 2 },
  ])

  const [cellAttendance, setCellAttendance] = useState<CellAttendance[]>([
    { cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' },
  ])

  const [newcomers, setNewcomers] = useState<Newcomer[]>([])

  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    worship: 0,
    meeting: 0,
  })

  const selectedDept = departments.find(d => d.id === form.department_id)

  // 부서 변경 시 출결 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!form.department_id) return

      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', form.department_id)
        .eq('is_active', true)

      const { data: membersData } = await supabase
        .from('members')
        .select('id')
        .eq('department_id', form.department_id)
        .eq('is_active', true)

      if (membersData && membersData.length > 0) {
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('attendance_date', form.report_date)
          .in('member_id', membersData.map(m => m.id))

        const worshipCount = attendance?.filter(a => a.attendance_type === 'worship' && a.is_present).length || 0
        const meetingCount = attendance?.filter(a => a.attendance_type === 'meeting' && a.is_present).length || 0

        setAttendanceSummary({
          total: count || 0,
          worship: worshipCount,
          meeting: meetingCount,
        })
      } else {
        setAttendanceSummary({ total: count || 0, worship: 0, meeting: 0 })
      }
    }

    loadData()
  }, [form.department_id, form.report_date, supabase])

  // 프로그램 관리
  const addProgram = () => {
    setPrograms([...programs, { start_time: '', end_time: '', content: '', person_in_charge: '', note: '', order_index: programs.length }])
  }

  const removeProgram = (index: number) => {
    setPrograms(programs.filter((_, i) => i !== index))
  }

  const updateProgram = (index: number, field: keyof Program, value: string | number) => {
    setPrograms(programs.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  // 셀 출결 관리
  const addCellAttendance = () => {
    setCellAttendance([...cellAttendance, { cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }])
  }

  const removeCellAttendance = (index: number) => {
    setCellAttendance(cellAttendance.filter((_, i) => i !== index))
  }

  const updateCellAttendance = (index: number, field: keyof CellAttendance, value: string | number) => {
    setCellAttendance(cellAttendance.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  // 새신자 관리
  const addNewcomer = () => {
    setNewcomers([...newcomers, { name: '', phone: '', birth_date: '', introducer: '', address: '', affiliation: '' }])
  }

  const removeNewcomer = (index: number) => {
    setNewcomers(newcomers.filter((_, i) => i !== index))
  }

  const updateNewcomer = (index: number, field: keyof Newcomer, value: string) => {
    setNewcomers(newcomers.map((n, i) => (i === index ? { ...n, [field]: value } : n)))
  }

  // 제출
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = true) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 셀별 합계 계산
      const totalRegistered = cellAttendance.reduce((sum, c) => sum + c.registered, 0) || attendanceSummary.total
      const totalWorship = cellAttendance.reduce((sum, c) => sum + c.worship, 0) || attendanceSummary.worship
      const totalMeeting = cellAttendance.reduce((sum, c) => sum + c.meeting, 0) || attendanceSummary.meeting

      const { data: report, error: reportError } = await supabase
        .from('weekly_reports')
        .insert({
          department_id: form.department_id,
          report_date: form.report_date,
          week_number: weekNumber,
          year: new Date(form.report_date).getFullYear(),
          author_id: authorId,
          total_registered: totalRegistered,
          worship_attendance: totalWorship,
          meeting_attendance: totalMeeting,
          notes: JSON.stringify({
            sermon_title: form.sermon_title,
            sermon_scripture: form.sermon_scripture,
            discussion_notes: form.discussion_notes,
            other_notes: form.other_notes,
            cell_attendance: cellAttendance,
          }),
          status: isDraft ? 'draft' : 'submitted',
          submitted_at: isDraft ? null : new Date().toISOString(),
        })
        .select()
        .single()

      if (reportError) throw reportError

      // 프로그램 저장
      if (programs.length > 0) {
        const { error: programError } = await supabase
          .from('report_programs')
          .insert(
            programs.map((p, i) => ({
              report_id: report.id,
              start_time: p.start_time || '00:00',
              content: `${p.content}${p.note ? ` [${p.note}]` : ''}`,
              person_in_charge: p.person_in_charge,
              order_index: i,
            }))
          )

        if (programError) throw programError
      }

      // 새신자 저장
      if (newcomers.length > 0) {
        const { error: newcomerError } = await supabase
          .from('newcomers')
          .insert(
            newcomers.filter(n => n.name).map(n => ({
              report_id: report.id,
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

      router.push('/reports')
      router.refresh()
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-lg border-b pb-2">기본 정보</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* 진행순서 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">진행순서</h2>
          <button type="button" onClick={addProgram} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            + 항목 추가
          </button>
        </div>

        <div className="overflow-x-auto">
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
                <tr key={index}>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={program.start_time}
                        onChange={(e) => updateProgram(index, 'start_time', e.target.value)}
                        className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      >
                        {generateTimeOptions().map((time) => (
                          <option key={`start-${index}-${time}`} value={time}>{time}</option>
                        ))}
                      </select>
                      <span className="text-gray-400">~</span>
                      <select
                        value={program.end_time}
                        onChange={(e) => updateProgram(index, 'end_time', e.target.value)}
                        className="w-[85px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      >
                        {generateTimeOptions().map((time) => (
                          <option key={`end-${index}-${time}`} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={program.content}
                      onChange={(e) => updateProgram(index, 'content', e.target.value)}
                      placeholder="예: 찬양 및 기도"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={program.person_in_charge}
                      onChange={(e) => updateProgram(index, 'person_in_charge', e.target.value)}
                      placeholder="담당자"
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={program.note}
                      onChange={(e) => updateProgram(index, 'note', e.target.value)}
                      placeholder="비고"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removeProgram(index)} className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 말씀 정보 */}
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
      </div>

      {/* 출결상황 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">출결상황</h2>
          <button type="button" onClick={addCellAttendance} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={cell.cell_name}
                      onChange={(e) => updateCellAttendance(index, 'cell_name', e.target.value)}
                      placeholder="셀 이름"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={cell.registered || ''}
                      onChange={(e) => updateCellAttendance(index, 'registered', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={cell.worship || ''}
                      onChange={(e) => updateCellAttendance(index, 'worship', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={cell.meeting || ''}
                      onChange={(e) => updateCellAttendance(index, 'meeting', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={cell.note}
                      onChange={(e) => updateCellAttendance(index, 'note', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeCellAttendance(index)} className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
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

      {/* 새신자 명단 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">새신자 명단</h2>
          <button type="button" onClick={addNewcomer} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            + 새신자 추가
          </button>
        </div>

        {newcomers.length > 0 ? (
          <div className="overflow-x-auto">
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
                  <tr key={index}>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newcomer.name}
                        onChange={(e) => updateNewcomer(index, 'name', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="tel"
                        value={newcomer.phone}
                        onChange={(e) => updateNewcomer(index, 'phone', e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={newcomer.birth_date}
                        onChange={(e) => updateNewcomer(index, 'birth_date', e.target.value)}
                        className="w-32 px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newcomer.introducer}
                        onChange={(e) => updateNewcomer(index, 'introducer', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newcomer.address}
                        onChange={(e) => updateNewcomer(index, 'address', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newcomer.affiliation}
                        onChange={(e) => updateNewcomer(index, 'affiliation', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => removeNewcomer(index)} className="text-gray-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">새신자가 없습니다</p>
        )}
      </div>

      {/* 논의사항 / 기타사항 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-900 mb-2">논의(특이)사항</label>
            <textarea
              value={form.discussion_notes}
              onChange={(e) => setForm({ ...form, discussion_notes: e.target.value })}
              rows={5}
              placeholder="• 논의사항을 입력하세요"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-900 mb-2">기타사항</label>
            <textarea
              value={form.other_notes}
              onChange={(e) => setForm({ ...form, other_notes: e.target.value })}
              rows={5}
              placeholder="• 기타사항을 입력하세요"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '저장 중...' : '제출'}
        </button>
      </div>
    </form>
  )
}
