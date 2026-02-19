'use client'

interface PhotoUploadSectionProps {
  photoFiles: File[]
  photoPreviews: string[]
  onPhotoAdd: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhotoRemove: (index: number) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

export default function PhotoUploadSection({
  photoFiles,
  photoPreviews,
  onPhotoAdd,
  onPhotoRemove,
  sectionRef,
}: PhotoUploadSectionProps) {
  return (
    <div
      ref={sectionRef}
      data-section="photos"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-semibold text-gray-900 text-base md:text-lg">사진 첨부</h2>
        <span className="text-xs text-gray-500">{photoFiles.length}/10장</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
        {/* 미리보기 */}
        {photoPreviews.map((preview, index) => (
          <div key={`photo-${index}-${preview.slice(-20)}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img src={preview} alt={`사진 ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onPhotoRemove(index)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* 추가 버튼 */}
        {photoFiles.length < 10 && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs text-gray-500 mt-1">추가</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotoAdd}
              className="hidden"
            />
          </label>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">활동 사진을 첨부하세요 (최대 10장)</p>
    </div>
  )
}
