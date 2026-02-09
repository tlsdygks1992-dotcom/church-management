import { SupabaseClient } from '@supabase/supabase-js'
import type { ApprovalStatus, UserRole } from '@/types/database'

// 알림 메시지 템플릿
const NOTIFICATION_MESSAGES: Record<string, { title: string; body: string }> = {
  submitted: {
    title: '새 보고서 제출',
    body: '{dept} {type} 보고서가 제출되었습니다.',
  },
  coordinator_reviewed: {
    title: '회장 협조 완료',
    body: '{dept} 보고서가 결재 대기 중입니다.',
  },
  manager_approved: {
    title: '부장 결재 완료',
    body: '{dept} 보고서가 최종 확인 대기 중입니다.',
  },
  final_approved: {
    title: '보고서 승인 완료',
    body: '보고서가 최종 승인되었습니다.',
  },
  rejected: {
    title: '보고서 반려',
    body: '보고서가 반려되었습니다. 확인해주세요.',
  },
}

// 보고서 타입 라벨
const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: '주차',
  meeting: '모임',
  education: '교육',
}

// 상태 변경에 따른 수신자 역할 매핑
const STATUS_TO_RECIPIENT_ROLE: Record<string, UserRole | 'author'> = {
  submitted: 'president',           // 제출됨 → 회장에게 알림
  coordinator_reviewed: 'accountant', // 회장 협조 → 부장에게 알림 (accountant = manager)
  manager_approved: 'super_admin',  // 부장 결재 → 목사(super_admin)에게 알림
  final_approved: 'author',         // 최종 승인 → 작성자에게 알림
  rejected: 'author',               // 반려 → 작성자에게 알림
}

interface NotificationData {
  userId: string
  title: string
  body: string
  link?: string
  reportId?: string
}

interface ApprovalNotificationParams {
  reportId: string
  fromStatus: ApprovalStatus
  toStatus: ApprovalStatus
  departmentName: string
  reportType: string
  authorId: string
}

/**
 * 역할별 사용자 ID 목록 조회
 */
export async function getRecipientsByRole(
  supabase: SupabaseClient,
  role: UserRole
): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', role)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to get recipients by role:', error)
    return []
  }

  return data?.map((u) => u.id) || []
}

/**
 * 단일 알림 생성
 */
export async function createNotification(
  supabase: SupabaseClient,
  data: NotificationData
): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert({
    user_id: data.userId,
    title: data.title,
    body: data.body,
    link: data.link || null,
    report_id: data.reportId || null,
    is_read: false,
    is_sent: false,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    return false
  }

  return true
}

/**
 * 여러 사용자에게 알림 생성
 */
export async function createNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  notification: Omit<NotificationData, 'userId'>
): Promise<boolean> {
  if (userIds.length === 0) return true

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    title: notification.title,
    body: notification.body,
    link: notification.link || null,
    report_id: notification.reportId || null,
    is_read: false,
    is_sent: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to create notifications:', error)
    return false
  }

  return true
}

/**
 * 결재 워크플로우 알림 생성
 * 상태 변경에 따라 적절한 수신자에게 알림을 전송
 */
export async function createApprovalNotification(
  supabase: SupabaseClient,
  params: ApprovalNotificationParams
): Promise<boolean> {
  const { reportId, toStatus, departmentName, reportType, authorId } = params

  // 알림 메시지 템플릿 가져오기
  const template = NOTIFICATION_MESSAGES[toStatus]
  if (!template) {
    console.log('No notification template for status:', toStatus)
    return true // 템플릿이 없으면 성공으로 처리
  }

  // 메시지 치환
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType
  const title = template.title
  const body = template.body
    .replace('{dept}', departmentName)
    .replace('{type}', typeLabel)

  // 링크 생성
  const link = `/reports/${reportId}`

  // 수신자 결정
  const recipientRole = STATUS_TO_RECIPIENT_ROLE[toStatus]
  if (!recipientRole) {
    console.log('No recipient role for status:', toStatus)
    return true
  }

  let recipientIds: string[] = []

  if (recipientRole === 'author') {
    // 작성자에게 알림
    recipientIds = [authorId]
  } else {
    // 역할별 사용자에게 알림
    recipientIds = await getRecipientsByRole(supabase, recipientRole)
  }

  if (recipientIds.length === 0) {
    console.log('No recipients found for role:', recipientRole)
    return true
  }

  // 알림 생성 (인앱)
  const result = await createNotifications(supabase, recipientIds, {
    title,
    body,
    link,
    reportId,
  })

  // 푸시 알림 전송 요청 (서버 API 호출, 실패해도 인앱 알림에 영향 없음)
  triggerPush(recipientIds, { title, body, link })

  return result
}

/**
 * 서버 API를 통해 푸시 알림 전송 (비동기, fire-and-forget)
 */
function triggerPush(
  userIds: string[],
  payload: { title: string; body: string; link?: string }
): void {
  fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds, ...payload }),
  }).catch((err) => console.error('Push trigger failed:', err))
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }

  return count || 0
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(
  supabase: SupabaseClient,
  notificationIds: string[]
): Promise<boolean> {
  if (notificationIds.length === 0) return true

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds)

  if (error) {
    console.error('Failed to mark notifications as read:', error)
    return false
  }

  return true
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    return false
  }

  return true
}
