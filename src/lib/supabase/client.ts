import { createBrowserClient } from '@supabase/ssr'

// 싱글톤 패턴 - 클라이언트 인스턴스 재사용
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )

  return client
}
