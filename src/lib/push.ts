import webpush from 'web-push'
import { SupabaseClient } from '@supabase/supabase-js'

// VAPID 설정
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@chungpa.church',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

interface PushPayload {
  title: string
  body: string
  link?: string
  icon?: string
}

/**
 * 특정 사용자의 모든 활성 구독에 푸시 전송
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<void> {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !subscriptions?.length) return

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    link: payload.link || '/',
    icon: '/icon-192.png',
  })

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        },
        pushPayload
      )
    )
  )

  // 만료/실패한 구독 비활성화
  const expiredIds: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      // 410 Gone 또는 404 Not Found → 구독 만료
      if (statusCode === 410 || statusCode === 404) {
        expiredIds.push(subscriptions[i].id)
      }
    }
  })

  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expiredIds)
  }
}

/**
 * 여러 사용자에게 푸시 전송
 */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(supabase, userId, payload))
  )
}
