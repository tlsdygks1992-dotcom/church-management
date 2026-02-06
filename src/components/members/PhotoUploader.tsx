'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PhotoUploaderProps {
  initialPhotoUrl: string | null
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function PhotoUploader({ initialPhotoUrl, onPhotoChange }: PhotoUploaderProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    onPhotoChange(e)
  }

  return (
    <div className="flex flex-col items-center">
      <label htmlFor="photo" className="cursor-pointer">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 hover:border-blue-400 transition-colors relative">
          {photoPreview ? (
            <Image
              src={photoPreview}
              alt="미리보기"
              fill
              sizes="128px"
              className="object-cover"
            />
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
        onChange={handleChange}
        className="hidden"
      />
      <p className="text-sm text-gray-500 mt-2">얼굴 매칭 출결에 사용됩니다</p>
    </div>
  )
}
