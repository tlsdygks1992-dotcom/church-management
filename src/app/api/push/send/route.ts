import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUsers } from '@/lib/push'

/**
 * POST /api/push/send
 * 서버 전용: 특정 사용자들에게 푸시 알림 전송
 * notifications.ts에서 인앱 알림 생성 후 호출됨
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 인증 확인 (로그인한 사용자만 호출 가능)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { userIds, title, body: pushBody, link } = body

  if (!userIds || !Array.isArray(userIds) || !title) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    await sendPushToUsers(supabase, userIds, {
      title,
      body: pushBody || '',
      link,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push send failed:', err)
    return NextResponse.json({ error: 'Push send failed' }, { status: 500 })
  }
}
