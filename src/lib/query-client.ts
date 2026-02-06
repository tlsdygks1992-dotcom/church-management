import { QueryClient } from '@tanstack/react-query'

/** 싱글톤 QueryClient 팩토리 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 5분간 캐시 유지
        staleTime: 5 * 60 * 1000,
        // 30분간 가비지 컬렉션 방지
        gcTime: 30 * 60 * 1000,
        // 윈도우 포커스 시 자동 리페치
        refetchOnWindowFocus: true,
        // 실패 시 1회 재시도
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/** 브라우저 환경에서 QueryClient 싱글톤 반환 */
export function getQueryClient() {
  // 서버에서는 항상 새 인스턴스
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  // 브라우저에서는 싱글톤
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
