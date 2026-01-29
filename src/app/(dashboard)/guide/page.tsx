export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">2026년도 교육부 안내사항</h1>
        <p className="text-gray-500 mt-1">2026. 1. 24.(토)</p>
      </div>

      {/* 1. 역할 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">1. 역할</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 w-24">구분</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 w-28">담당자</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">세부 역할</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-4 font-medium text-gray-900 align-top">회장</td>
                  <td className="px-4 py-4 text-blue-600 font-medium align-top">신요한</td>
                  <td className="px-4 py-4 text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">CU(청소년부, 청년1•2부) 운영 총괄</p>
                    <ul className="space-y-1 text-sm">
                      <li>- 팀별 운영 점검 및 지원</li>
                      <li>- CU 예배 담당: 찬양팀장 조율, 광고</li>
                      <li>- 교회행사 조율: 운영위원회 참여</li>
                      <li>- 리더모임</li>
                    </ul>
                  </td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-4 font-medium text-gray-900 align-top">회계</td>
                  <td className="px-4 py-4 text-blue-600 font-medium align-top">김재우</td>
                  <td className="px-4 py-4 text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">CU 예산 총괄</p>
                    <ul className="space-y-1 text-sm">
                      <li>- 월별 운영계획 확인(팀별) 및 운영비 취합 신청</li>
                      <li className="pl-3 text-gray-500">(결의서 ⇒ 결재: 부장 ⇒ 재정부 신청)</li>
                      <li>- 팀별 운영비 송금</li>
                      <li>- 월별 팀 운영비 정산</li>
                      <li>- 분기별(3·6·9·12월) 회계장부 보고</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-gray-900 align-top" rowSpan={2}>팀장</td>
                  <td className="px-4 py-4 text-blue-600 font-medium align-top">
                    <div className="space-y-1">
                      <p>박영민</p>
                      <p>이정현</p>
                      <p>김효정</p>
                      <p>김선웅</p>
                      <p>유하은</p>
                      <p>권성경</p>
                      <p>김유창</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">부서 운영 총괄</p>
                    <ul className="space-y-1 text-sm">
                      <li>- 부서원(셀장) 심방 및 관리</li>
                      <li>- 팀 예산 신청 및 관리</li>
                      <li>- 매 주일 부서 보고서 결재 <span className="text-red-500">※ 피드백 확인</span></li>
                      <li className="pl-3 text-gray-500">(작성자 ⇒ 회장 ⇒ 부장 ⇒ 담당목사 ⇒ 작성자)</li>
                      <li>- 프로젝트 기획 및 운영</li>
                    </ul>
                  </td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-4 font-medium text-gray-900 align-top">담당 목사</td>
                  <td className="px-4 py-4 text-blue-600 font-medium align-top">전홍균</td>
                  <td className="px-4 py-4 text-gray-600">
                    <ul className="space-y-1 text-sm">
                      <li>- 리더(팀장) 및 셀장 교육 총괄</li>
                      <li>- CU 예배 말씀</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-gray-900 align-top">부장</td>
                  <td className="px-4 py-4 text-blue-600 font-medium align-top">강현숙</td>
                  <td className="px-4 py-4 text-gray-600">
                    <ul className="space-y-1 text-sm">
                      <li>- 교육부 행정 총괄</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. 협의 및 보고 프로세스 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">2. 협의 및 보고 프로세스</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">안건 발생</span>
            <span className="text-gray-400">⇒</span>
            <span className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg">회의 요청</span>
            <span className="text-gray-400">⇒</span>
            <span className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg">논의를 통한 결정</span>
            <span className="text-gray-400">⇒</span>
            <span className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg">보고 (계획서, 결의서 등)</span>
            <span className="text-gray-400">⇒</span>
            <span className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg">운영 및 집행</span>
            <span className="text-gray-400">⇒</span>
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg font-medium">결과 공유 및 보고</span>
          </div>
        </div>
      </div>

      {/* 3. 결재 프로세스 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">3. 주차 보고서 결재 프로세스</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">작성자</p>
              <p className="text-xs text-gray-500">(팀장)</p>
            </div>
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">회장</p>
              <p className="text-xs text-blue-600">신요한</p>
            </div>
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">부장</p>
              <p className="text-xs text-green-600">강현숙</p>
            </div>
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">담당목사</p>
              <p className="text-xs text-purple-600">전홍균</p>
            </div>
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">피드백</p>
              <p className="text-xs text-orange-600">작성자 확인</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 참고사항 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">4. 참고사항</h2>
        </div>
        <div className="p-6">
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span><strong>[예산]</strong> 2024년도 교육위원회 행정 절차 안내자료 참조</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span><strong>[리더교육]</strong> 매주 토요일 10~12시</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 부서 연락처 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">5. 부서 구성</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">CK (유치·유년부)</h3>
              <p className="text-sm text-gray-500">유치부 및 유년부 통합</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">청소년부</h3>
              <p className="text-sm text-gray-500">중·고등부</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">CU 1청년부</h3>
              <p className="text-sm text-gray-500">20대 청년부</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">CU 2청년부</h3>
              <p className="text-sm text-gray-500">30대 청년부</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
