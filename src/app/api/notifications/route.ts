import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/notifications
 * 현재 사용자의 알림 목록 조회
 *
 * Query params:
 * - limit: 가져올 알림 개수 (기본값: 20)
 * - unread_only: true면 읽지 않은 알림만 (기본값: false)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 현재 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 쿼리 파라미터
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const unreadOnly = searchParams.get('unread_only') === 'true'

  // 알림 조회
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data: notifications, error } = await query

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  // 읽지 않은 알림 개수
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({
    notifications,
    unreadCount: unreadCount || 0,
  })
}

/**
 * PATCH /api/notifications
 * 알림 읽음 처리
 *
 * Body:
 * - notification_ids: 읽음 처리할 알림 ID 배열 (선택)
 * - mark_all_read: true면 모든 알림 읽음 처리 (선택)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // 현재 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { notification_ids, mark_all_read } = body

  if (mark_all_read) {
    // 모든 알림 읽음 처리
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Failed to mark all as read:', error)
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
    }
  } else if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
    // 특정 알림만 읽음 처리 (본인 알림만)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', notification_ids)

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 업데이트된 읽지 않은 개수 반환
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({
    success: true,
    unreadCount: unreadCount || 0,
  })
}
