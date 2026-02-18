import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 (중요: getUser 호출로 세션 유효성 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 로그인 필요한 페이지 보호
  const protectedPaths = ['/dashboard', '/reports', '/attendance', '/members', '/approvals', '/stats', '/users']
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )

  // 승인 대기 페이지는 로그인 필요하지만 승인 체크 제외
  const isPendingPage = pathname === '/pending'

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 승인 상태 확인은 layout에서 처리 (미들웨어 성능 최적화)
  // is_active 체크를 위한 추가 DB 호출 제거

  return supabaseResponse
}
