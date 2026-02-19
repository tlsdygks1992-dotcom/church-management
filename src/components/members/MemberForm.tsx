'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/database'
import PhotoUploader from './PhotoUploader'
import DepartmentSelector from './DepartmentSelector'
import { CU1_DEPARTMENT_CODE } from '@/lib/constants'

interface Department {
  id: string
  name: string
  code?: string
}

interface MemberDepartmentData {
  department_id: string
  is_primary: boolean
  cell_id?: string | null
  departments: {
    id: string
    name: string
  }
}

interface MemberWithDepartments extends Member {
  member_departments?: MemberDepartmentData[]
}

interface NewcomerData {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  address: string | null
  affiliation: string | null
  department_id: string | null
}

interface MemberFormProps {
  departments: Department[]
  member?: MemberWithDepartments
  newcomerData?: NewcomerData | null
}

export default function MemberForm({ departments, member, newcomerData }: MemberFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const isEdit = !!member

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 member_departments에서 부서 ID 목록 추출
  const initialDeptIds = member?.member_departments?.map(md => md.department_id) || []
  const initialPrimaryDeptId = member?.member_departments?.find(md => md.is_primary)?.department_id ||
    initialDeptIds[0] || departments[0]?.id || ''

  const [form, setForm] = useState({
    name: member?.name || newcomerData?.name || '',
    phone: member?.phone || newcomerData?.phone || '',
    email: member?.email || '',
    birth_date: member?.birth_date || newcomerData?.birth_date || '',
    address: member?.address || newcomerData?.address || '',
    occupation: member?.occupation || newcomerData?.affiliation || '',
    guardian: (member as any)?.guardian || '',
  })

  // 새신자의 부서 기본 선택
  const newcomerDeptId = newcomerData?.department_id && departments.some(d => d.id === newcomerData.department_id)
    ? newcomerData.department_id
    : null

  // 다중 부서 선택
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    initialDeptIds.length > 0
      ? initialDeptIds
      : newcomerDeptId
        ? [newcomerDeptId]
        : (departments[0]?.id ? [departments[0].id] : [])
  )
  // 주 소속 부서
  const [primaryDeptId, setPrimaryDeptId] = useState<string>(
    initialPrimaryDeptId || newcomerDeptId || departments[0]?.id || ''
  )

  // cu1 부서의 셀 선택
  const cu1Dept = departments.find(d => d.code === CU1_DEPARTMENT_CODE)
  const initialCellId = cu1Dept
    ? member?.member_departments?.find(md => md.department_id === cu1Dept.id)?.cell_id || ''
    : ''
  const [selectedCellId, setSelectedCellId] = useState<string>(initialCellId || '')

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
        // cu1 해제 시 셀 초기화
        if (cu1Dept && deptId === cu1Dept.id) {
          setSelectedCellId('')
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
        // 파일 타입/크기 검증
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error('지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP만 가능)')
        }
        if (file.size > MAX_SIZE) {
          throw new Error('파일 크기는 10MB 이하만 가능합니다.')
        }
        const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
          throw new Error('지원하지 않는 파일 확장자입니다.')
        }
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
            guardian: form.guardian || null,
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
          throw new Error(`부서 연결 삭제 실패: ${deleteError.message}`)
        }

        const deptRecords = selectedDeptIds.map(deptId => ({
          member_id: member.id,
          department_id: deptId,
          is_primary: deptId === primaryDeptId,
          cell_id: (cu1Dept && deptId === cu1Dept.id && selectedCellId) ? selectedCellId : null,
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
          cell_id: (cu1Dept && deptId === cu1Dept.id && selectedCellId) ? selectedCellId : null,
        }))

        const { error: deptError } = await supabase
          .from('member_departments')
          .insert(deptRecords)

        if (deptError) throw deptError

        // 새신자 → 교인 전환 시, newcomer 레코드에 member_id 기록
        if (newcomerData?.id) {
          await supabase
            .from('newcomers')
            .update({ converted_to_member_id: newMember.id })
            .eq('id', newcomerData.id)
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['members'] })
      router.push('/members')
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
          selectedCellId={selectedCellId}
          onCellIdChange={setSelectedCellId}
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

        {/* 보호자 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">보호자</label>
          <input
            type="text"
            value={form.guardian}
            onChange={(e) => setForm({ ...form, guardian: e.target.value })}
            placeholder="예: 홍길동 집사"
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
