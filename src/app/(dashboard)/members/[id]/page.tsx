'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Member {
  id: string
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  photo_url: string | null
  department_id: string
  departments: {
    name: string
  }
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMember()
  }, [params.id])

  const loadMember = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*, departments(name)')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error loading member:', error)
      return
    }

    setMember(data as Member)
    setLoading(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !member) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      // 파일 이름 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `${member.id}.${fileExt}`

      // 기존 파일 삭제 (있으면)
      if (member.photo_url) {
        try {
          const oldPath = member.photo_url.split('/member-photos/')[1]?.split('?')[0]
          if (oldPath) {
            await supabase.storage.from('member-photos').remove([oldPath])
          }
        } catch (e) {
          console.log('기존 사진 삭제 실패 (무시):', e)
        }
      }

      // 새 파일 업로드
      const filePath = `members/${fileName}`
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath)

      // 캐시 방지를 위한 타임스탬프 추가
      const photoUrlWithCache = `${urlData.publicUrl}?t=${Date.now()}`

      // DB 업데이트
      const { error: updateError } = await supabase
        .from('members')
        .update({
          photo_url: photoUrlWithCache,
          photo_updated_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (updateError) throw updateError

      setMember({ ...member, photo_url: photoUrlWithCache })
      setMessage('사진이 업로드되었습니다.')
    } catch (error) {
      console.error('Upload error:', error)
      setMessage('업로드 실패. 다시 시도해주세요.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">교인을 찾을 수 없습니다.</p>
        <Link href="/members" className="text-blue-600 hover:underline mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/members" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 사진 영역 */}
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 flex flex-col items-center">
          <div className="relative">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-white shadow-lg">
              {member.photo_url ? (
                <img
                  src={member.photo_url.includes('?') ? member.photo_url : `${member.photo_url}?t=${Date.now()}`}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                  <span className="text-5xl font-bold text-gray-500">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* 업로드 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mt-4">{member.name}</h1>
          <p className="text-gray-600">{member.departments?.name}</p>

          {message && (
            <p className={`mt-3 text-sm ${message.includes('실패') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">연락처</p>
              <p className="font-medium">{member.phone || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">생년월일</p>
              <p className="font-medium">{member.birth_date || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">이메일</p>
              <p className="font-medium">{member.email || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
