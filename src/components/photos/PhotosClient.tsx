'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { usePhotos, type Photo } from '@/queries/photos'
import Image from 'next/image'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default function PhotosClient() {
  const { user } = useAuth()
  const { data: departments = [], isLoading: deptsLoading } = useDepartments()
  const queryClient = useQueryClient()

  const [selectedDept, setSelectedDept] = useState<string>('all')
  const { data: photos = [], isLoading: photosLoading } = usePhotos(selectedDept)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 모달 상태
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  const userDeptId = user?.user_departments?.[0]?.department_id || departments[0]?.id || ''
  const [uploadForm, setUploadForm] = useState({
    department_id: userDeptId,
    title: '',
    description: '',
    photo_date: new Date().toISOString().split('T')[0],
  })
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([])

  // 업로드 권한 체크
  const adminRoles = ['super_admin', 'president', 'accountant', 'team_leader']
  const canUpload = adminRoles.includes(user?.role || '')

  const handleDeptChange = useCallback((dept: string) => {
    setSelectedDept(dept)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setError(null)

    if (files.length > 10) {
      setError('한 번에 최대 10장까지 업로드할 수 있습니다.')
      return
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`지원하지 않는 파일 형식입니다: ${file.name}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일 크기가 10MB를 초과합니다: ${file.name}`)
        return
      }
    }

    setUploadFiles(files)

    const previews: string[] = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.push(e.target?.result as string)
        if (previews.length === files.length) {
          setUploadPreviews([...previews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !user?.id) {
      setError(`업로드 불가: files=${uploadFiles.length}, userId=${user?.id}`)
      return
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()

    try {
      const errors: string[] = []
      let successCount = 0

      for (const file of uploadFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${uploadForm.department_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('department-photos')
          .upload(fileName, file)

        if (uploadError) {
          errors.push(`Storage: ${uploadError.message}`)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('department-photos')
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase.from('department_photos').insert({
          department_id: uploadForm.department_id,
          photo_url: publicUrl,
          title: uploadForm.title || null,
          description: uploadForm.description || null,
          photo_date: uploadForm.photo_date || null,
          uploaded_by: user.id,
        })

        if (dbError) {
          errors.push(`DB: ${dbError.message}`)
          continue
        }

        successCount++
      }

      if (successCount === 0) {
        setError(`업로드 실패: ${errors.join(' | ')}`)
        return
      }

      setShowUploadModal(false)
      setUploadFiles([])
      setUploadPreviews([])
      setUploadForm(prev => ({ ...prev, title: '', description: '' }))
      setError(null)
      // TanStack Query 캐시 무효화 → 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(`예외 발생: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return

    const supabase = createClient()

    try {
      const path = photo.photo_url.split('/department-photos/')[1]?.split('?')[0]
      if (path) {
        await supabase.storage.from('department-photos').remove([path])
      }

      await supabase.from('department_photos').delete().eq('id', photo.id)

      setSelectedPhoto(null)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    } catch {
      setError('삭제 중 오류가 발생했습니다.')
    }
  }

  // 초기 로딩
  if (!user || deptsLoading) {
    return (
      <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl w-20" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">활동 사진</h1>
          <p className="text-sm text-gray-500 mt-0.5">부서별 활동 사진 갤러리</p>
        </div>
        {canUpload && (
          <button
            onClick={() => {
              if (selectedDept !== 'all') {
                setUploadForm(prev => ({ ...prev, department_id: selectedDept }))
              }
              setShowUploadModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>업로드</span>
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 부서 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => handleDeptChange('all')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
            selectedDept === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => handleDeptChange(dept.id)}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
              selectedDept === dept.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* 사진 그리드 */}
      {photosLoading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity relative group"
            >
              <Image
                src={photo.photo_url}
                alt={photo.title || '활동 사진'}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{photo.departments?.name}</p>
                {photo.photo_date && (
                  <p className="text-white/80 text-xs">
                    {new Date(photo.photo_date).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <span className="text-4xl mb-3 block">📷</span>
          <p className="text-gray-500 text-sm">아직 등록된 사진이 없습니다.</p>
          {canUpload && (
            <button
              onClick={() => {
                if (selectedDept !== 'all') {
                  setUploadForm(prev => ({ ...prev, department_id: selectedDept }))
                }
                setShowUploadModal(true)
              }}
              className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              첫 사진 업로드하기
            </button>
          )}
        </div>
      )}

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">사진 업로드</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFiles([])
                  setUploadPreviews([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <select
                  value={uploadForm.department_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, department_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">촬영일</label>
                <input
                  type="date"
                  value={uploadForm.photo_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, photo_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 (선택)</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="예: 2024년 1월 셀모임"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="사진에 대한 설명"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사진 선택</label>
                {uploadPreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {uploadPreviews.map((preview, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                        <Image src={preview} alt="" fill sizes="80px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
                <label className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">사진을 선택하세요 (최대 10장)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFiles([])
                  setUploadPreviews([])
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : `업로드 (${uploadFiles.length}장)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 상세 모달 */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white mb-2">
              <div>
                <p className="font-medium">{selectedPhoto.departments?.name}</p>
                <p className="text-sm text-white/70">
                  {selectedPhoto.photo_date && new Date(selectedPhoto.photo_date).toLocaleDateString('ko-KR')}
                  {selectedPhoto.users?.name && ` · ${selectedPhoto.users.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canUpload && (
                  <button
                    onClick={() => handleDelete(selectedPhoto)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-white/70 hover:text-white"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="relative w-full max-h-[80vh] flex items-center justify-center">
              <Image
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title || '활동 사진'}
                width={1200}
                height={800}
                className="max-h-[80vh] w-auto h-auto object-contain mx-auto rounded-lg"
                priority
              />
            </div>
            {(selectedPhoto.title || selectedPhoto.description) && (
              <div className="mt-2 text-white">
                {selectedPhoto.title && <p className="font-medium">{selectedPhoto.title}</p>}
                {selectedPhoto.description && <p className="text-sm text-white/70">{selectedPhoto.description}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
