'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useDepartments } from '@/queries/departments'
import { useMembers } from '@/queries/members'
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants'
import type { MemberWithDepts } from '@/types/shared'

interface PhotoEntry {
  file: File
  preview: string
  matchedMemberId: string | null
  matchedMemberName: string | null
  autoMatched: boolean
  status: 'pending' | 'uploading' | 'success' | 'error'
  errorMessage?: string
}

/** 파일명에서 확장자 제거하고 이름 부분 추출 */
function extractNameFromFile(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '') // 확장자 제거
    .replace(/[_\-\d]+$/, '') // 뒤쪽 숫자/언더스코어 제거 (예: 홍길동_1.jpg)
    .trim()
}

/** 교인 이름과 파일명 매칭 */
function autoMatchMembers(
  files: File[],
  members: MemberWithDepts[]
): PhotoEntry[] {
  return files.map((file) => {
    const nameFromFile = extractNameFromFile(file.name)
    const matched = members.find((m) => m.name === nameFromFile)

    return {
      file,
      preview: URL.createObjectURL(file),
      matchedMemberId: matched?.id || null,
      matchedMemberName: matched?.name || null,
      autoMatched: !!matched,
      status: 'pending' as const,
    }
  })
}

export default function BulkPhotoUpload() {
  const supabase = useMemo(() => createClient(), [])
  const { data: departments = [] } = useDepartments()
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const { data: allMembers = [] } = useMembers(
    selectedDeptId ? [selectedDeptId] : undefined
  )
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })

  // 매칭 가능한 교인 (이미 매칭된 교인 제외)
  const getAvailableMembers = useCallback(
    (currentEntryId: string | null) => {
      const matchedIds = new Set(
        photos
          .filter((p) => p.matchedMemberId && p.matchedMemberId !== currentEntryId)
          .map((p) => p.matchedMemberId)
      )
      return allMembers.filter((m) => !matchedIds.has(m.id))
    },
    [photos, allMembers]
  )

  // 부서 선택 시 사진 초기화
  const handleDeptChange = useCallback((deptId: string) => {
    setSelectedDeptId(deptId)
    // 기존 preview URL 정리
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotos([])
  }, [photos])

  // 파일 선택/드래그앤드롭
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      // 유효성 검사
      const validFiles: File[] = []
      const errors: string[] = []

      files.forEach((file) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          errors.push(`${file.name}: 지원하지 않는 형식입니다 (JPG, PNG, GIF, WebP만 가능)`)
          return
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: 파일 크기가 10MB를 초과합니다`)
          return
        }
        validFiles.push(file)
      })

      if (errors.length > 0) {
        alert(errors.join('\n'))
      }

      if (validFiles.length === 0) return

      // 자동 매칭
      const newEntries = autoMatchMembers(validFiles, allMembers)

      // 기존 항목과 합치기 (중복 파일명 방지)
      setPhotos((prev) => {
        const existingNames = new Set(prev.map((p) => p.file.name))
        const filtered = newEntries.filter((e) => !existingNames.has(e.file.name))
        return [...prev, ...filtered]
      })

      // input 초기화 (같은 파일 다시 선택 가능하도록)
      e.target.value = ''
    },
    [allMembers]
  )

  // 수동 매칭 변경
  const handleMatchChange = useCallback(
    (index: number, memberId: string) => {
      setPhotos((prev) =>
        prev.map((p, i) => {
          if (i !== index) return p
          const member = allMembers.find((m) => m.id === memberId)
          return {
            ...p,
            matchedMemberId: memberId || null,
            matchedMemberName: member?.name || null,
            autoMatched: false,
          }
        })
      )
    },
    [allMembers]
  )

  // 사진 항목 삭제
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // 전체 업로드
  const handleUpload = useCallback(async () => {
    const toUpload = photos.filter((p) => p.matchedMemberId && p.status !== 'success')
    if (toUpload.length === 0) {
      alert('매칭된 사진이 없습니다. 교인을 선택해주세요.')
      return
    }

    // 기존 사진 덮어쓰기 경고
    const membersWithPhotos = toUpload.filter((p) => {
      const member = allMembers.find((m) => m.id === p.matchedMemberId)
      return member?.photo_url
    })
    if (membersWithPhotos.length > 0) {
      const names = membersWithPhotos.map((p) => p.matchedMemberName).join(', ')
      if (!confirm(`${names}의 기존 사진이 덮어쓰기됩니다. 계속할까요?`)) {
        return
      }
    }

    setIsUploading(true)
    setUploadProgress({ done: 0, total: toUpload.length })

    for (let i = 0; i < photos.length; i++) {
      const entry = photos[i]
      if (!entry.matchedMemberId || entry.status === 'success') continue

      // 상태를 uploading으로 변경
      setPhotos((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: 'uploading' } : p))
      )

      try {
        const memberId = entry.matchedMemberId
        const fileExt = entry.file.name.split('.').pop()
        const fileName = `${memberId}_${Date.now()}.${fileExt}`
        const filePath = `members/${fileName}`

        // 기존 사진 삭제
        const member = allMembers.find((m) => m.id === memberId)
        if (member?.photo_url) {
          try {
            const oldPath = member.photo_url.split('/member-photos/')[1]?.split('?')[0]
            if (oldPath) {
              await supabase.storage.from('member-photos').remove([oldPath])
            }
          } catch {
            // 기존 사진 삭제 실패 무시
          }
        }

        // Storage 업로드
        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(filePath, entry.file, { upsert: true })

        if (uploadError) throw uploadError

        // public URL 가져오기
        const {
          data: { publicUrl },
        } = supabase.storage.from('member-photos').getPublicUrl(filePath)

        const photoUrl = `${publicUrl}?t=${Date.now()}`

        // DB 업데이트
        const { error: dbError } = await supabase
          .from('members')
          .update({
            photo_url: photoUrl,
            photo_updated_at: new Date().toISOString(),
          })
          .eq('id', memberId)

        if (dbError) throw dbError

        // 성공
        setPhotos((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: 'success' } : p))
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : '업로드 실패'
        setPhotos((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', errorMessage: message } : p
          )
        )
      }

      setUploadProgress((prev) => ({ ...prev, done: prev.done + 1 }))
    }

    setIsUploading(false)
  }, [photos, allMembers, supabase])

  // 통계
  const matchedCount = photos.filter((p) => p.matchedMemberId).length
  const autoMatchedCount = photos.filter((p) => p.autoMatched).length
  const successCount = photos.filter((p) => p.status === 'success').length
  const errorCount = photos.filter((p) => p.status === 'error').length

  return (
    <div className="space-y-6">
      {/* 부서 선택 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">1. 부서 선택</h2>
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleDeptChange(dept.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDeptId === dept.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
        {selectedDeptId && (
          <p className="text-sm text-gray-500 mt-3">
            해당 부서 교인: {allMembers.length}명
          </p>
        )}
      </div>

      {/* 사진 업로드 영역 */}
      {selectedDeptId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            2. 사진 선택
            <span className="text-sm font-normal text-gray-500 ml-2">
              파일명을 교인 이름으로 맞추면 자동 매칭됩니다 (예: 홍길동.jpg)
            </span>
          </h2>

          {/* 파일 선택 버튼 */}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-gray-500 mt-2">
              클릭하여 사진 선택 (여러 장 가능)
            </span>
            <span className="text-xs text-gray-400 mt-1">
              JPG, PNG, GIF, WebP / 최대 10MB
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* 통계 */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 text-sm">
              <span className="text-gray-600">
                전체: <strong>{photos.length}장</strong>
              </span>
              <span className="text-green-600">
                자동 매칭: <strong>{autoMatchedCount}건</strong>
              </span>
              <span className="text-blue-600">
                매칭 완료: <strong>{matchedCount}건</strong>
              </span>
              {successCount > 0 && (
                <span className="text-emerald-600">
                  업로드 완료: <strong>{successCount}건</strong>
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-600">
                  실패: <strong>{errorCount}건</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 매칭 목록 */}
      {photos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            3. 교인 매칭
            <span className="text-sm font-normal text-gray-500 ml-2">
              매칭되지 않은 사진은 드롭다운에서 교인을 선택하세요
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((entry, index) => (
              <div
                key={`${entry.file.name}-${index}`}
                className={`border rounded-xl p-3 ${
                  entry.status === 'success'
                    ? 'border-green-300 bg-green-50'
                    : entry.status === 'error'
                      ? 'border-red-300 bg-red-50'
                      : entry.status === 'uploading'
                        ? 'border-blue-300 bg-blue-50'
                        : entry.matchedMemberId
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-orange-200 bg-orange-50/50'
                }`}
              >
                {/* 사진 미리보기 + 상태 */}
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                    <Image
                      src={entry.preview}
                      alt={entry.file.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.file.name}
                    </p>
                    {entry.status === 'success' && (
                      <p className="text-xs text-green-600 mt-1">업로드 완료</p>
                    )}
                    {entry.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        {entry.errorMessage || '업로드 실패'}
                      </p>
                    )}
                    {entry.status === 'uploading' && (
                      <p className="text-xs text-blue-600 mt-1">업로드 중...</p>
                    )}
                    {entry.status === 'pending' && entry.autoMatched && (
                      <p className="text-xs text-green-600 mt-1">
                        자동 매칭: {entry.matchedMemberName}
                      </p>
                    )}
                    {entry.status === 'pending' && !entry.matchedMemberId && (
                      <p className="text-xs text-orange-600 mt-1">매칭 필요</p>
                    )}
                  </div>
                  {/* 삭제 버튼 */}
                  {entry.status !== 'uploading' && entry.status !== 'success' && (
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="text-gray-400 hover:text-red-500 shrink-0 self-start"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* 교인 선택 드롭다운 */}
                {entry.status !== 'success' && (
                  <select
                    value={entry.matchedMemberId || ''}
                    onChange={(e) => handleMatchChange(index, e.target.value)}
                    disabled={isUploading}
                    className={`w-full mt-3 px-3 py-2 text-sm border rounded-lg ${
                      entry.matchedMemberId
                        ? 'border-green-300 bg-white'
                        : 'border-orange-300 bg-white'
                    }`}
                  >
                    <option value="">-- 교인 선택 --</option>
                    {getAvailableMembers(entry.matchedMemberId).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.photo_url ? ' (사진 있음)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* 업로드 버튼 */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={isUploading || matchedCount === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading
                ? `업로드 중... (${uploadProgress.done}/${uploadProgress.total})`
                : `${matchedCount}장 업로드`}
            </button>

            {successCount > 0 && successCount === photos.length && (
              <span className="text-green-600 text-sm font-medium">
                모든 사진이 업로드되었습니다!
              </span>
            )}

            {successCount > 0 && successCount < photos.length && !isUploading && (
              <span className="text-sm text-gray-500">
                {successCount}장 완료 / {photos.length - successCount}장 남음
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
