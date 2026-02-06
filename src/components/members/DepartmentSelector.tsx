'use client'

import { memo } from 'react'

interface Department {
  id: string
  name: string
}

interface DepartmentSelectorProps {
  departments: Department[]
  selectedDeptIds: string[]
  primaryDeptId: string
  onToggle: (deptId: string) => void
  onPrimaryChange: (deptId: string) => void
}

const DepartmentSelector = memo(function DepartmentSelector({
  departments,
  selectedDeptIds,
  primaryDeptId,
  onToggle,
  onPrimaryChange,
}: DepartmentSelectorProps) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        소속 부서 <span className="text-red-500">*</span>
        <span className="text-xs text-gray-500 ml-2">(여러 부서 선택 가능)</span>
      </label>
      <div className="space-y-2 p-3 border border-gray-200 rounded-xl bg-gray-50">
        {departments.map((dept) => {
          const isSelected = selectedDeptIds.includes(dept.id)
          const isPrimary = primaryDeptId === dept.id
          return (
            <div key={dept.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`dept-${dept.id}`}
                checked={isSelected}
                onChange={() => onToggle(dept.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`dept-${dept.id}`}
                className={`flex-1 text-sm cursor-pointer ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
              >
                {dept.name}
              </label>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => onPrimaryChange(dept.id)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    isPrimary
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {isPrimary ? '주 소속' : '주 소속으로'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {selectedDeptIds.length === 0 && (
        <p className="text-red-500 text-xs mt-1">최소 1개 부서를 선택해주세요</p>
      )}
    </div>
  )
})

export default DepartmentSelector
