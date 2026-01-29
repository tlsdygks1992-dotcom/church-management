'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/database'

interface Department {
  id: string
  name: string
}

interface MemberFormProps {
  departments: Department[]
  member?: Member
}

export default function MemberForm({ departments, member }: MemberFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!member

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(member?.photo_url || null)

  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    birth_date: member?.birth_date || '',
    address: member?.address || '',
    occupation: member?.occupation || '',
    department_id: member?.department_id || departments[0]?.id || '',
  })

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 미리보기
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
            const oldPath = member.photo_url.split('/photos/')[1]?.split('?')[0]
            if (oldPath) {
              await supabase.storage.from('photos').remove([oldPath])
            }
          } catch (e) {
            console.log('기존 사진 삭제 실패 (무시):', e)
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file, { upsert: true })

        if (uploadError) {
          console.error('업로드 오류:', uploadError)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        // 캐시 방지를 위한 타임스탬프 추가
        photo_url = `${publicUrl}?t=${Date.now()}`
      }

      if (isEdit) {
        // 수정
        const { error } = await supabase
          .from('members')
          .update({
            ...form,
            photo_url,
            photo_updated_at: file ? new Date().toISOString() : member?.photo_updated_at,
          })
          .eq('id', member.id)

        if (error) throw error
      } else {
        // 등록
        const { error } = await supabase
          .from('members')
          .insert({
            ...form,
            photo_url,
            photo_updated_at: file ? new Date().toISOString() : null,
          })

        if (error) throw error
      }

      router.push('/members')
      router.refresh()
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      {/* 사진 업로드 */}
      <div className="flex flex-col items-center">
        <label htmlFor="photo" className="cursor-pointer">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 hover:border-blue-400 transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="미리보기" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-xs mt-1">사진 추가</span>
              </div>
            )}
          </div>
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <p className="text-sm text-gray-500 mt-2">얼굴 매칭 출결에 사용됩니다</p>
      </div>

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

        {/* 부서 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            부서 <span className="text-red-500">*</span>
          </label>
          <select
            required
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
