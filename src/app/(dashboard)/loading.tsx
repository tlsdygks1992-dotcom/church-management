export default function DashboardLoading() {
  return (
    <div className="space-y-4 lg:space-y-6 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 lg:h-7 bg-gray-200 rounded-lg w-32 lg:w-48" />
          <div className="h-4 bg-gray-100 rounded w-48 lg:w-64" />
        </div>
        <div className="h-10 bg-gray-200 rounded-xl w-20 lg:w-24" />
      </div>

      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="h-4 bg-gray-100 rounded w-16 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* 콘텐츠 스켈레톤 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-6 bg-gray-100 rounded-full w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
