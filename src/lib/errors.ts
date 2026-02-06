/** 앱 전역 에러 기본 클래스 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** API/Supabase 호출 실패 에러 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message, 'API_ERROR', 500)
    this.name = 'ApiError'
  }
}

/** 인증 관련 에러 */
export class AuthError extends AppError {
  constructor(message: string = '로그인이 필요합니다.') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthError'
  }
}

/** 권한 부족 에러 */
export class ForbiddenError extends AppError {
  constructor(message: string = '접근 권한이 없습니다.') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

/** 에러 메시지 추출 유틸리티 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '알 수 없는 오류가 발생했습니다.'
}
