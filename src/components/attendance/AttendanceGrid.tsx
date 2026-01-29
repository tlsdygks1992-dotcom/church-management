'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Department {
  id: string
  name: string
  code: string
}

interface MemberBasic {
  id: string
  name: string
  photo_url: string | null
}

interface AttendanceRecordBasic {
  id: string
  member_id: string
  attendance_type: string
  is_present: boolean
}

interface AttendanceGridProps {
  departments: Department[]
  defaultDepartmentId: string
  members: MemberBasic[]
  attendanceRecords: AttendanceRecordBasic[]
  attendanceDate: string
}

export default function AttendanceGrid({
  departments,
  defaultDepartmentId,
  members: initialMembers,
  attendanceRecords: initialRecords,
  attendanceDate,
}: AttendanceGridProps) {
  const [selectedDept, setSelectedDept] = useState(defaultDepartmentId)
  const [selectedDate, setSelectedDate] = useState(attendanceDate)
  const [members, setMembers] = useState(initialMembers)
  const [records, setRecords] = useState(initialRecords)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  // 부서 변경 시 데이터 로드
  const handleDeptChange = async (deptId: string) => {
    setSelectedDept(deptId)
    await loadData(deptId, selectedDate)
  }

  // 날짜 변경 시 데이터 로드
  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    await loadData(selectedDept, date)
  }

  const loadData = async (deptId: string, date: string) => {
    startTransition(async () => {
      const { data: newMembersData } = await supabase
        .from('members')
        .select('id, name, photo_url')
        .eq('department_id', deptId)
        .eq('is_active', true)
        .order('name')

      const newMembers = (newMembersData || []) as MemberBasic[]
      setMembers(newMembers)

      if (newMembers.length > 0) {
        const { data: newRecords } = await supabase
          .from('attendance_records')
          .select('id, member_id, attendance_type, is_present')
          .eq('attendance_date', date)
          .in('member_id', newMembers.map(m => m.id))

        setRecords((newRecords || []) as AttendanceRecordBasic[])
      } else {
        setRecords([])
      }
    })
  }

  // 출결 토글
  const toggleAttendance = async (memberId: string, type: 'worship' | 'meeting') => {
    setSaving(`${memberId}-${type}`)

    const existingRecord = records.find(
      r => r.member_id === memberId && r.attendance_type === type
    )

    try {
      if (existingRecord) {
        const newPresent = !existingRecord.is_present
        setRecords(prev =>
          prev.map(r =>
            r.id === existingRecord.id ? { ...r, is_present: newPresent } : r
          )
        )

        await supabase
          .from('attendance_records')
          .update({ is_present: newPresent })
          .eq('id', existingRecord.id)
      } else {
        const newRecord = {
          member_id: memberId,
          attendance_date: selectedDate,
          attendance_type: type,
          is_present: true,
          checked_via: 'manual',
        }

        const { data } = await supabase
          .from('attendance_records')
          .insert(newRecord)
          .select('id, member_id, attendance_type, is_present')
          .single()

        if (data) {
          setRecords(prev => [...prev, data as AttendanceRecordBasic])
        }
      }
    } finally {
      setSaving(null)
    }
  }

  // 출결 상태 확인
  const isPresent = (memberId: string, type: 'worship' | 'meeting') => {
    const record = records.find(
      r => r.member_id === memberId && r.attendance_type === type
    )
    return record?.is_present || false
  }

  // 통계
  const worshipCount = members.filter(m => isPresent(m.id, 'worship')).length
  const meetingCount = members.filter(m => isPresent(m.id, 'meeting')).length
  const totalCount = members.length

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* 부서 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">부서</label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* 날짜 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* 통계 */}
          <div className="flex items-center gap-4 ml-auto text-sm">
            <span className="text-gray-500">
              재적: <span className="font-semibold text-gray-900">{totalCount}명</span>
            </span>
            <span className="text-blue-600">
              예배: <span className="font-semibold">{worshipCount}명</span>
            </span>
            <span className="text-green-600">
              모임: <span className="font-semibold">{meetingCount}명</span>
            </span>
          </div>
        </div>
      </div>

      {/* 출결표 (엑셀 스타일) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">No</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">이름</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 w-24">
                  <div className="flex flex-col items-center">
                    <span>예배</span>
                    <span className="text-xs font-normal text-gray-500">{worshipCount}/{totalCount}</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 w-24">
                  <div className="flex flex-col items-center">
                    <span>모임</span>
                    <span className="text-xs font-normal text-gray-500">{meetingCount}/{totalCount}</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member, index) => {
                const worshipPresent = isPresent(member.id, 'worship')
                const meetingPresent = isPresent(member.id, 'meeting')
                const isSavingWorship = saving === `${member.id}-worship`
                const isSavingMeeting = saving === `${member.id}-meeting`

                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      worshipPresent && meetingPresent ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggleAttendance(member.id, 'worship')}
                        disabled={isPending || isSavingWorship}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          worshipPresent
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 hover:border-blue-400 text-transparent hover:text-blue-400'
                        } ${isSavingWorship ? 'opacity-50' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggleAttendance(member.id, 'meeting')}
                        disabled={isPending || isSavingMeeting}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          meetingPresent
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400 text-transparent hover:text-green-400'
                        } ${isSavingMeeting ? 'opacity-50' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {/* 비고란 - 추후 메모 기능 추가 가능 */}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">등록된 교인이 없습니다.</p>
            <a href="/members" className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium">
              교인 등록하기 →
            </a>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-500"></div>
          <span>예배 출석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-500"></div>
          <span>모임 출석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border-2 border-gray-300"></div>
          <span>미출석</span>
        </div>
      </div>
    </div>
  )
}
