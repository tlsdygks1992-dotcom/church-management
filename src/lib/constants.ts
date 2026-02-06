// ─── 파일 업로드 ────────────────────────────────────
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// ─── 페이지네이션 ───────────────────────────────────
export const DEFAULT_PAGE_SIZE = 50

// ─── 보고서 ─────────────────────────────────────────
export const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: '주차',
  meeting: '모임',
  education: '교육',
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  submitted: '제출됨',
  coordinator_reviewed: '회장 협조',
  manager_approved: '부장 결재',
  final_approved: '최종 승인',
  rejected: '반려',
  revision_requested: '수정 요청',
}

// ─── 월 이름 ────────────────────────────────────────
export const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
