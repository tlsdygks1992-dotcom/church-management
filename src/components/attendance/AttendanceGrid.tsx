'use client'

import { useState, useTransition, useMemo, useCallback, memo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { exportAttendanceToExcel } from '@/lib/excel'

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

// 메모이제이션된 멤버 행
const MemberRow = memo(function MemberRow({
  member,
  index,
  worshipPresent,
  meetingPresent,
  isSavingWorship,
  isSavingMeeting,
  isPending,
  onToggle,
}: {
  member: MemberBasic
  index: number
  worshipPresent: boolean
  meetingPresent: boolean
  isSavingWorship: boolean
  isSavingMeeting: boolean
  isPending: boolean
  onToggle: (memberId: string, type: 'worship' | 'meeting') => void
}) {
  return (
    <tr
      className={`active:bg-gray-100 transition-colors ${
        worshipPresent && meetingPresent ? 'bg-green-50/50' : ''
      }`}
    >
      <td className="px-2 lg:px-4 py-2 text-gray-500 text-xs lg:text-sm">{index + 1}</td>
      <td className="px-2 lg:px-4 py-2">
        <div className="flex items-center gap-2">
          {member.photo_url ? (
            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full overflow-hidden relative">
              <Image
                src={member.photo_url}
                alt={member.name}
                fill
                sizes="28px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] lg:text-xs font-medium text-gray-600">
              {member.name.charAt(0)}
            </div>
          )}
          <span className="font-medium text-gray-900 text-xs lg:text-sm">{member.name}</span>
        </div>
      </td>
      <td className="px-2 lg:px-4 py-2 text-center">
        <button
          onClick={() => onToggle(member.id, 'worship')}
          disabled={isPending || isSavingWorship}
          className={`w-9 h-9 lg:w-8 lg:h-8 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${
            worshipPresent
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 active:border-blue-400 text-transparent active:text-blue-400'
          } ${isSavingWorship ? 'opacity-50' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </td>
      <td className="px-2 lg:px-4 py-2 text-center">
        <button
          onClick={() => onToggle(member.id, 'meeting')}
          disabled={isPending || isSavingMeeting}
          className={`w-9 h-9 lg:w-8 lg:h-8 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${
            meetingPresent
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 active:border-green-400 text-transparent active:text-green-400'
          } ${isSavingMeeting ? 'opacity-50' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </td>
    </tr>
  )
})

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
  const [bulkSaving, setBulkSaving] = useState<string | null>(null)

  // Supabase 클라이언트를 useMemo로 캐싱
  const supabase = useMemo(() => createClient(), [])

  // 출결 상태를 Map으로 캐싱
  const attendanceMap = useMemo(() => {
    const map = new Map<string, boolean>()
    records.forEach(r => {
      if (r.is_present) {
        map.set(`${r.member_id}-${r.attendance_type}`, true)
      }
    })
    return map
  }, [records])

  // 통계 메모이제이션
  const stats = useMemo(() => {
    let worship = 0
    let meeting = 0
    members.forEach(m => {
      if (attendanceMap.get(`${m.id}-worship`)) worship++
      if (attendanceMap.get(`${m.id}-meeting`)) meeting++
    })
    return { worship, meeting, total: members.length }
  }, [members, attendanceMap])

  const loadData = useCallback(async (deptId: string, date: string) => {
    startTransition(async () => {
      // member_departments를 통해 해당 부서에 속한 교인 ID 조회
      const { data: memberDeptData } = await supabase
        .from('member_departments')
        .select('member_id')
        .eq('department_id', deptId)

      const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]

      let newMembers: MemberBasic[] = []
      if (memberIds.length > 0) {
        const { data: newMembersData } = await supabase
          .from('members')
          .select('id, name, photo_url')
          .in('id', memberIds)
          .eq('is_active', true)
          .order('name')

        newMembers = (newMembersData || []) as MemberBasic[]
      }

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
  }, [supabase])

  const handleDeptChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value
    setSelectedDept(deptId)
    loadData(deptId, selectedDate)
  }, [selectedDate, loadData])

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    setSelectedDate(date)
    loadData(selectedDept, date)
  }, [selectedDept, loadData])

  const toggleAttendance = useCallback(async (memberId: string, type: 'worship' | 'meeting') => {
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
  }, [records, selectedDate, supabase])

  // 일괄 출석 체크
  const bulkCheckAttendance = useCallback(async (type: 'worship' | 'meeting', markPresent: boolean) => {
    if (members.length === 0) return

    setBulkSaving(`${type}-${markPresent ? 'check' : 'uncheck'}`)

    try {
      // 출석 처리할 멤버들 찾기
      const membersToUpdate = members.filter(m => {
        const isPresent = attendanceMap.get(`${m.id}-${type}`) || false
        return markPresent ? !isPresent : isPresent
      })

      if (membersToUpdate.length === 0) {
        setBulkSaving(null)
        return
      }

      if (markPresent) {
        // 전체 출석 체크
        const newRecordsToInsert: {
          member_id: string
          attendance_date: string
          attendance_type: string
          is_present: boolean
          checked_via: string
        }[] = []
        const recordsToUpdate: string[] = []

        for (const member of membersToUpdate) {
          const existingRecord = records.find(
            r => r.member_id === member.id && r.attendance_type === type
          )

          if (existingRecord) {
            recordsToUpdate.push(existingRecord.id)
          } else {
            newRecordsToInsert.push({
              member_id: member.id,
              attendance_date: selectedDate,
              attendance_type: type,
              is_present: true,
              checked_via: 'bulk',
            })
          }
        }

        // 기존 레코드 업데이트
        if (recordsToUpdate.length > 0) {
          await supabase
            .from('attendance_records')
            .update({ is_present: true })
            .in('id', recordsToUpdate)
        }

        // 새 레코드 삽입
        if (newRecordsToInsert.length > 0) {
          const { data: insertedRecords } = await supabase
            .from('attendance_records')
            .insert(newRecordsToInsert)
            .select('id, member_id, attendance_type, is_present')

          if (insertedRecords) {
            setRecords(prev => [
              ...prev.map(r =>
                recordsToUpdate.includes(r.id) ? { ...r, is_present: true } : r
              ),
              ...(insertedRecords as AttendanceRecordBasic[])
            ])
          }
        } else {
          setRecords(prev =>
            prev.map(r =>
              recordsToUpdate.includes(r.id) ? { ...r, is_present: true } : r
            )
          )
        }
      } else {
        // 전체 결석 처리
        const recordIds = records
          .filter(r => r.attendance_type === type && r.is_present)
          .map(r => r.id)

        if (recordIds.length > 0) {
          await supabase
            .from('attendance_records')
            .update({ is_present: false })
            .in('id', recordIds)

          setRecords(prev =>
            prev.map(r =>
              recordIds.includes(r.id) ? { ...r, is_present: false } : r
            )
          )
        }
      }
    } finally {
      setBulkSaving(null)
    }
  }, [members, records, attendanceMap, selectedDate, supabase])

  // 엑셀 내보내기
  const handleExportExcel = useCallback(() => {
    const selectedDeptObj = departments.find(d => d.id === selectedDept)
    const exportData = members.map(member => ({
      name: member.name,
      date: selectedDate,
      worship: attendanceMap.get(`${member.id}-worship`) ? 'O' : 'X',
      meeting: attendanceMap.get(`${member.id}-meeting`) ? 'O' : 'X',
    }))
    exportAttendanceToExcel(exportData, selectedDeptObj?.name || '전체', selectedDate)
  }, [members, attendanceMap, selectedDate, selectedDept, departments])

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* 상단 컨트롤 */}
      <div className="bg-white rounded-2xl p-3 lg:p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {/* 부서 및 날짜 선택 */}
          <div className="flex items-center gap-2 flex-1">
            <select
              value={selectedDept}
              onChange={handleDeptChange}
              className="flex-1 lg:flex-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* 통계 및 내보내기 */}
          <div className="flex items-center justify-between lg:justify-end gap-3 lg:gap-4 text-sm border-t border-gray-100 pt-3 lg:border-0 lg:pt-0">
            <span className="text-gray-500">
              재적 <span className="font-semibold text-gray-900">{stats.total}</span>
            </span>
            <span className="text-blue-600">
              예배 <span className="font-semibold">{stats.worship}</span>
            </span>
            <span className="text-green-600">
              모임 <span className="font-semibold">{stats.meeting}</span>
            </span>
            <button
              onClick={handleExportExcel}
              className="p-1.5 lg:px-3 lg:py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
              title="엑셀 내보내기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden lg:inline text-xs font-medium">엑셀</span>
            </button>
          </div>
        </div>
      </div>

      {/* 출결표 (엑셀 스타일) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 lg:px-4 py-2.5 lg:py-3 text-left font-semibold text-gray-700 w-8 lg:w-12 text-xs lg:text-sm">No</th>
                <th className="px-2 lg:px-4 py-2.5 lg:py-3 text-left font-semibold text-gray-700 text-xs lg:text-sm">이름</th>
                <th className="px-2 lg:px-4 py-2.5 lg:py-3 text-center font-semibold text-gray-700 w-20 lg:w-28">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs lg:text-sm">예배</span>
                    <span className="text-[10px] lg:text-xs font-normal text-gray-500">{stats.worship}/{stats.total}</span>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => bulkCheckAttendance('worship', true)}
                        disabled={bulkSaving !== null || stats.worship === stats.total}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="전체 출석"
                      >
                        {bulkSaving === 'worship-check' ? '...' : '전체'}
                      </button>
                      <button
                        onClick={() => bulkCheckAttendance('worship', false)}
                        disabled={bulkSaving !== null || stats.worship === 0}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="전체 결석"
                      >
                        {bulkSaving === 'worship-uncheck' ? '...' : '초기화'}
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-2 lg:px-4 py-2.5 lg:py-3 text-center font-semibold text-gray-700 w-20 lg:w-28">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs lg:text-sm">모임</span>
                    <span className="text-[10px] lg:text-xs font-normal text-gray-500">{stats.meeting}/{stats.total}</span>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => bulkCheckAttendance('meeting', true)}
                        disabled={bulkSaving !== null || stats.meeting === stats.total}
                        className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="전체 출석"
                      >
                        {bulkSaving === 'meeting-check' ? '...' : '전체'}
                      </button>
                      <button
                        onClick={() => bulkCheckAttendance('meeting', false)}
                        disabled={bulkSaving !== null || stats.meeting === 0}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="전체 결석"
                      >
                        {bulkSaving === 'meeting-uncheck' ? '...' : '초기화'}
                      </button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member, index) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  index={index}
                  worshipPresent={attendanceMap.get(`${member.id}-worship`) || false}
                  meetingPresent={attendanceMap.get(`${member.id}-meeting`) || false}
                  isSavingWorship={saving === `${member.id}-worship`}
                  isSavingMeeting={saving === `${member.id}-meeting`}
                  isPending={isPending}
                  onToggle={toggleAttendance}
                />
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className="p-6 lg:p-8 text-center">
            <svg className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 text-sm">등록된 교인이 없습니다.</p>
            <a href="/members" className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
              교인 등록하기 →
            </a>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center lg:justify-start gap-4 lg:gap-6 text-xs lg:text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 lg:w-5 lg:h-5 rounded bg-blue-500"></div>
          <span>예배</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 lg:w-5 lg:h-5 rounded bg-green-500"></div>
          <span>모임</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 lg:w-5 lg:h-5 rounded border-2 border-gray-300"></div>
          <span>미출석</span>
        </div>
      </div>
    </div>
  )
}
