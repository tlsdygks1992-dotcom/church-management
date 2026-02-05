'use client'

import { useState, useCallback } from 'react'
import { importAccountingFromExcel, AccountingImportRow } from '@/lib/excel'

interface AccountingImportProps {
  onImport: (data: AccountingImportRow[]) => void
  onClose: () => void
}

export default function AccountingImport({ onImport, onClose }: AccountingImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    data: AccountingImportRow[]
    errors: string[]
    warnings: string[]
  } | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setResult(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handlePreview = async () => {
    if (!file) return

    setLoading(true)
    try {
      const importResult = await importAccountingFromExcel(file)
      setResult(importResult)
    } catch (error) {
      setResult({
        data: [],
        errors: ['파일 처리 중 오류가 발생했습니다.'],
        warnings: []
      })
    }
    setLoading(false)
  }

  const handleConfirmImport = () => {
    if (result && result.data.length > 0) {
      onImport(result.data)
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">엑셀 가져오기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* 파일 선택 영역 */}
          {!result && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              {file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    파일 제거
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      파일을 드래그하거나 클릭하여 선택하세요
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      xlsx, xls 파일 지원
                    </p>
                  </div>
                  <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700">
                    파일 선택
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 엑셀 형식 안내 */}
          {!result && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">엑셀 형식 안내</h3>
              <p className="text-xs text-gray-500 mb-2">
                첫 행에 다음 열 이름을 포함해야 합니다:
              </p>
              <div className="flex flex-wrap gap-2">
                {['일', '적요', '수입금액', '지출금액', '구분', '비고'].map((col) => (
                  <span key={col} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 오류/경고 표시 */}
          {result && result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-700 mb-2">오류</h3>
              <ul className="text-sm text-red-600 space-y-1">
                {result.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {result && result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">경고</h3>
              <ul className="text-sm text-yellow-600 space-y-1">
                {result.warnings.slice(0, 5).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
                {result.warnings.length > 5 && (
                  <li className="text-yellow-500">... 외 {result.warnings.length - 5}개</li>
                )}
              </ul>
            </div>
          )}

          {/* 미리보기 테이블 */}
          {result && result.data.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                미리보기 ({result.data.length}건)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">일</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">적요</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">수입</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">지출</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">구분</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.data.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">{row.day}</td>
                          <td className="px-3 py-2 text-gray-900 truncate max-w-[150px]">{row.description}</td>
                          <td className="px-3 py-2 text-right text-blue-600">
                            {row.incomeAmount > 0 ? formatAmount(row.incomeAmount) : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600">
                            {row.expenseAmount > 0 ? formatAmount(row.expenseAmount) : ''}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{row.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.data.length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
                    ... 외 {result.data.length - 10}건
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            취소
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? '분석 중...' : '미리보기'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setFile(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                다시 선택
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={result.data.length === 0}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {result.data.length}건 가져오기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
