import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/push/subscribe
 * 푸시 알림 구독 등록
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
  }

  // 이미 동일 endpoint가 등록되어 있으면 업데이트
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase
      .from('push_subscriptions')
      .update({
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        is_active: true,
        user_agent: request.headers.get('user-agent') || null,
      })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        is_active: true,
        user_agent: request.headers.get('user-agent') || null,
      })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
