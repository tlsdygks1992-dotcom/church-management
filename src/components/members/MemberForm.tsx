'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/database'
import PhotoUploader from './PhotoUploader'
import DepartmentSelector from './DepartmentSelector'

interface Department {
  id: string
  name: string
}

interface MemberDepartmentData {
  department_id: string
  is_primary: boolean
  departments: {
    id: string
    name: string
  }
}

interface MemberWithDepartments extends Member {
  member_departments?: MemberDepartmentData[]
}

interface MemberFormProps {
  departments: Department[]
  member?: MemberWithDepartments
}

export default function MemberForm({ departments, member }: MemberFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isEdit = !!member

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 member_departments에서 부서 ID 목록 추출
  const initialDeptIds = member?.member_departments?.map(md => md.department_id) || []
  const initialPrimaryDeptId = member?.member_departments?.find(md => md.is_primary)?.department_id ||
    initialDeptIds[0] || departments[0]?.id || ''

  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    birth_date: member?.birth_date || '',
    address: member?.address || '',
    occupation: member?.occupation || '',
  })

  // 다중 부서 선택
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    initialDeptIds.length > 0 ? initialDeptIds : (departments[0]?.id ? [departments[0].id] : [])
  )
  // 주 소속 부서
  const [primaryDeptId, setPrimaryDeptId] = useState<string>(initialPrimaryDeptId)

  // 부서 체크박스 토글
  const handleDeptToggle = (deptId: string) => {
    setSelectedDeptIds(prev => {
      if (prev.includes(deptId)) {
        // 마지막 하나는 제거 불가
        if (prev.length === 1) return prev
        const newIds = prev.filter(id => id !== deptId)
        // 주 소속 부서가 제거되면 첫 번째 부서를 주 소속으로
        if (primaryDeptId === deptId) {
          setPrimaryDeptId(newIds[0])
        }
        return newIds
      } else {
        return [...prev, deptId]
      }
    })
  }

  // 주 소속 부서 변경
  const handlePrimaryChange = (deptId: string) => {
    if (selectedDeptIds.includes(deptId)) {
      setPrimaryDeptId(deptId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 부서 선택 유효성 검사
    if (selectedDeptIds.length === 0) {
      setError('최소 1개 부서를 선택해주세요')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let photo_url = member?.photo_url || null

      // 사진 업로드
      const fileInput = document.getElementById('photo') as HTMLInputElement
      const file = fileInput?.files?.[0]
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${member?.id || 'new'}_${Date.now()}.${fileExt}`
        const filePath = `members/${fileName}`

        // 기존 사진 삭제 (수정 시)
        if (isEdit && member?.photo_url) {
          try {
            const oldPath = member.photo_url.split('/member-photos/')[1]?.split('?')[0]
            if (oldPath) {
              await supabase.storage.from('member-photos').remove([oldPath])
            }
          } catch {
            // 기존 사진 삭제 실패 시 무시
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(filePath, file, { upsert: true })

        if (uploadError) {
          console.error('업로드 오류:', uploadError)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('member-photos')
          .getPublicUrl(filePath)

        // 캐시 방지를 위한 타임스탬프 추가
        photo_url = `${publicUrl}?t=${Date.now()}`
      }

      if (isEdit) {
        // 수정: members 테이블 업데이트
        const { error: memberError } = await supabase
          .from('members')
          .update({
            name: form.name,
            phone: form.phone || null,
            email: form.email || null,
            birth_date: form.birth_date || null,
            address: form.address || null,
            occupation: form.occupation || null,
            department_id: primaryDeptId,
            photo_url,
            photo_updated_at: file ? new Date().toISOString() : member?.photo_updated_at,
          })
          .eq('id', member.id)

        if (memberError) {
          throw new Error(`교인 정보 업데이트 실패: ${memberError.message}`)
        }

        // member_departments 업데이트: 기존 삭제 후 재생성
        const { error: deleteError } = await supabase
          .from('member_departments')
          .delete()
          .eq('member_id', member.id)

        if (deleteError) {
          // 부서 연결 삭제 실패는 무시하고 계속 진행
        }

        const deptRecords = selectedDeptIds.map(deptId => ({
          member_id: member.id,
          department_id: deptId,
          is_primary: deptId === primaryDeptId,
        }))

        const { error: deptError } = await supabase
          .from('member_departments')
          .insert(deptRecords)

        if (deptError) {
          throw new Error(`부서 연결 추가 실패: ${deptError.message}`)
        }
      } else {
        // 등록: members 테이블에 먼저 삽입
        const { data: newMember, error: memberError } = await supabase
          .from('members')
          .insert({
            ...form,
            department_id: primaryDeptId, // 호환성을 위해 주 소속 부서 저장
            photo_url,
            photo_updated_at: file ? new Date().toISOString() : null,
            is_active: true,
          })
          .select('id')
          .single()

        if (memberError) throw memberError

        // member_departments에 부서 연결 추가
        const deptRecords = selectedDeptIds.map(deptId => ({
          member_id: newMember.id,
          department_id: deptId,
          is_primary: deptId === primaryDeptId,
        }))

        const { error: deptError } = await supabase
          .from('member_departments')
          .insert(deptRecords)

        if (deptError) throw deptError
      }

      router.push('/members')
      router.refresh()
    } catch (err: unknown) {
      let errorMessage = '알 수 없는 오류'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Supabase 에러 객체 처리
        const supabaseError = err as { message?: string; details?: string; hint?: string; code?: string }
        errorMessage = supabaseError.message || supabaseError.details || JSON.stringify(err)
      } else {
        errorMessage = String(err)
      }
      setError(`저장 중 오류: ${errorMessage}`)
      console.error('저장 오류 상세:', JSON.stringify(err, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      {/* 사진 업로드 */}
      <PhotoUploader
        initialPhotoUrl={member?.photo_url || null}
        onPhotoChange={() => {/* file은 input#photo에서 직접 참조 */}}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* 연락처 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-0000-0000"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* 생년월일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* 부서 (다중 선택) */}
        <DepartmentSelector
          departments={departments}
          selectedDeptIds={selectedDeptIds}
          primaryDeptId={primaryDeptId}
          onToggle={handleDeptToggle}
          onPrimaryChange={handlePrimaryChange}
        />

        {/* 직업/소속 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">직업/소속</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* 주소 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '저장 중...' : isEdit ? '수정' : '등록'}
        </button>
      </div>
    </form>
  )
}
