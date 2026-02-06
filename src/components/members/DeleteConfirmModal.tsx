'use client'

import { memo } from 'react'
import type { MemberWithDepts } from '@/types/shared'

interface DeleteConfirmModalProps {
  member: MemberWithDepts | null
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal = memo(function DeleteConfirmModal({
  member,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!member) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">교인 삭제</h3>
          <p className="text-gray-500 text-sm mb-6">
            <strong className="text-gray-700">{member.name}</strong>님을 삭제하시겠습니까?
            <br />
            <span className="text-red-500">이 작업은 되돌릴 수 없습니다.</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
})

export default DeleteConfirmModal
