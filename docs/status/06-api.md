# API 및 유틸리티

## 1. Supabase 클라이언트

### 클라이언트 컴포넌트용

**경로**: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
```

#### 특징

- 싱글톤 패턴으로 인스턴스 재사용
- 메모리 효율화 및 연결 관리
- 컴포넌트에서 `useMemo`로 캐싱 권장

#### 사용 예시

```typescript
import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const supabase = useMemo(() => createClient(), [])

  // supabase.from('table')...
}
```

---

### 서버 컴포넌트용

**경로**: `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

#### 특징

- 서버 사이드 렌더링 지원
- 쿠키 기반 세션 관리
- 비동기 함수 (await 필요)

---

### 미들웨어용

**경로**: `src/lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

#### 특징

- 모든 요청에서 세션 갱신
- 쿠키 자동 갱신
- `src/middleware.ts`에서 호출

---

## 2. Providers (Context)

### AuthProvider
**경로**: `src/providers/AuthProvider.tsx`
- `useAuth()` 훅으로 현재 사용자 정보 접근
- Header, Sidebar 등에서 prop drilling 없이 사용
- dashboard layout.tsx에서 래핑

### QueryProvider
**경로**: `src/providers/QueryProvider.tsx`
- TanStack Query 클라이언트 제공
- `src/lib/query-client.ts`에서 설정 관리

### ToastProvider
**경로**: `src/providers/ToastProvider.tsx`
- `useToastContext()` 훅으로 toast.success/error/warning/info 호출
- 7개 컴포넌트에서 alert() 대체

---

## 3. TanStack Query 훅

**경로**: `src/queries/`

| 파일 | 주요 훅 | 용도 |
|------|---------|------|
| `departments.ts` | `useDepartments`, `useCells` | 부서/셀 목록 조회 (staleTime 10분) |
| `members.ts` | `useMembers`, `useDeleteMember` | 교인 CRUD |
| `reports.ts` | `useReports` | 보고서 조회 |
| `notifications.ts` | `useNotifications` | 알림 조회/읽음 |
| `accounting.ts` | `useAccountingRecordsByMonth` | 회계 기록 조회 (staleTime 60초) |
| `attendance.ts` | `useAttendanceRecords`, `useToggleAttendance` | 출결 기록 조회/수정 |
| `dashboard.ts` | `useRecentReports`, `useThisWeekReport`, `useDashboardPending`, `useThisWeekStats` | 대시보드 데이터 |
| `users.ts` | `useAllUsers` | 전체 사용자 목록 (관리자용) |
| `approvals.ts` | `usePendingReports`, `useCompletedReports` | 결재 대기/완료 보고서 |
| `photos.ts` | `usePhotos` | 사진 목록 조회 |
| `stats.ts` | `useDepartmentStats`, `useWeeklyTrend` | 통계 데이터 |

---

## 4. 커스텀 훅

| 훅 | 파일 | 용도 |
|----|------|------|
| `useDebounce` | `src/hooks/useDebounce.ts` | 입력 디바운스 |
| `useToast` | `src/hooks/useToast.ts` | 토스트 알림 관리 |

---

## 5. 유틸리티 라이브러리

### 권한 체크
**경로**: `src/lib/permissions.ts`

| 함수 | 설명 |
|------|------|
| `isAdmin(role)` | super_admin 여부 |
| `isAdminRole(role)` | super_admin/president/accountant 여부 |
| `canAccessAllDepartments(role)` | 모든 부서 접근 가능 여부 |
| `canAccessAccounting(role)` | 회계 기능 접근 가능 여부 |
| `canEditMembers(role)` | 교인 관리 권한 여부 |

### 공통 상수
**경로**: `src/lib/constants.ts`
- `MONTHS` - 월 목록, `MAX_FILE_SIZE` - 업로드 제한
- `CU1_DEPARTMENT_CODE` - 1청년부 코드 ('cu1')
- 페이지네이션, 라벨 등

### 유틸리티 함수
**경로**: `src/lib/utils.ts`
- `formatDate`, `formatPhone`, `formatCurrency`, `getWeekNumber`, `calculateAge`

### 에러 클래스
**경로**: `src/lib/errors.ts`
- `AppError`, `ApiError`, `AuthError`, `ForbiddenError`

### Rate Limiting
**경로**: `src/lib/rate-limit.ts`
- 토큰 버킷 알고리즘 기반 rate limiter
- `/api/notifications` GET/PATCH에 적용

### 공유 타입
**경로**: `src/types/shared.ts`
- `UserData`, `UserDepartment`, `LayoutUser`
- `MemberWithDepts`, `MemberDepartmentInfo`
- `CellInfo` - 셀 정보 인터페이스
- `ReportSummary`, `DepartmentInfo`

---

## 6. API 라우트

### 알림 API

**경로**: `src/app/api/notifications/route.ts`

#### Rate Limiting
- `checkRateLimit()` 적용 (GET/PATCH 모두)
- 초과 시 429 Too Many Requests 반환

#### GET - 알림 목록 조회

```typescript
// 요청
GET /api/notifications

// 응답
{
  "notifications": [
    {
      "id": "uuid",
      "title": "새 보고서가 제출되었습니다",
      "body": "CU1부 주차 보고서",
      "link": "/reports/123",
      "is_read": false,
      "created_at": "2026-01-31T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### PATCH - 알림 읽음 처리

```typescript
// 요청
PATCH /api/notifications
{
  "id": "notification-id",      // 단일 알림 읽음
  "markAllAsRead": true         // 모두 읽음 (id와 함께 사용 불가)
}

// 응답
{ "success": true }
```

### 푸시 구독 API

**경로**: `src/app/api/push/subscribe/route.ts`

#### POST - 푸시 구독 등록

```typescript
// 요청
POST /api/push/subscribe
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}

// 응답
{ "success": true }
```

- 기존 endpoint가 있으면 upsert (재활성화)
- `push_subscriptions` 테이블에 저장

---

### 푸시 구독 해제 API

**경로**: `src/app/api/push/unsubscribe/route.ts`

#### POST - 푸시 구독 해제

```typescript
// 요청
POST /api/push/unsubscribe
{ "endpoint": "https://fcm.googleapis.com/..." }

// 응답
{ "success": true }
```

- `is_active: false`로 비활성화

---

### 푸시 전송 API

**경로**: `src/app/api/push/send/route.ts`

#### POST - 사용자에게 푸시 전송

```typescript
// 요청
POST /api/push/send
{
  "userIds": ["user-uuid-1", "user-uuid-2"],
  "title": "새 보고서 제출",
  "body": "CU1부 주차 보고서가 제출되었습니다.",
  "link": "/reports/123"
}

// 응답
{ "success": true }
```

- 인증 필수 (로그인 사용자만)
- `notifications.ts`의 `triggerPush()`에서 fire-and-forget으로 호출
- 만료된 구독(410/404) 자동 비활성화

---

### 푸시 유틸리티

**경로**: `src/lib/push.ts`

#### 함수 목록

| 함수 | 설명 |
|------|------|
| `sendPushToUser(supabase, userId, payload)` | 특정 사용자의 활성 구독에 푸시 전송 |
| `sendPushToUsers(supabase, userIds, payload)` | 여러 사용자에게 푸시 전송 |

#### 특징

- `web-push` 라이브러리 사용 (서버 전용)
- VAPID 키 lazy 초기화 (빌드 시 실행 방지)
- 만료/실패 구독 자동 비활성화 (410 Gone, 404 Not Found)

---

## 7. 기존 유틸리티 함수

### 알림 유틸리티

**경로**: `src/lib/notifications.ts`

#### 함수 목록

| 함수 | 설명 |
|------|------|
| `getRecipientsByRole(role)` | 역할별 사용자 ID 목록 조회 |
| `createNotification(data)` | 단일 알림 생성 |
| `createNotifications(dataArray)` | 다중 알림 생성 |
| `createApprovalNotification(params)` | 결재 워크플로우 알림 생성 |
| `getUnreadCount(userId)` | 읽지 않은 알림 개수 |
| `markAsRead(notificationId)` | 알림 읽음 처리 |
| `markAllAsRead(userId)` | 모든 알림 읽음 처리 |

#### createApprovalNotification 사용 예시

```typescript
await createApprovalNotification({
  reportId: 'report-uuid',
  fromStatus: 'submitted',
  toStatus: 'coordinator_reviewed',
  departmentName: 'CU1부',
  authorId: 'author-uuid'
})
```

#### 알림 템플릿

| 상태 변경 | 메시지 템플릿 |
|----------|--------------|
| → submitted | "새 보고서가 제출되었습니다: {부서명}" |
| → coordinator_reviewed | "회장 협조가 완료되었습니다: {부서명}" |
| → manager_approved | "부장 결재가 완료되었습니다: {부서명}" |
| → final_approved | "보고서가 최종 승인되었습니다: {부서명}" |
| → rejected | "보고서가 반려되었습니다: {부서명}" |
| → revision_requested | "보고서 수정이 요청되었습니다: {부서명}" |

---

### 엑셀 유틸리티

**경로**: `src/lib/excel.ts`

#### 함수 목록

| 함수 | 설명 |
|------|------|
| `exportToExcel(data, columns, filename)` | 범용 엑셀 내보내기 |
| `exportMembersToExcel(members)` | 교인 명단 내보내기 |
| `exportAttendanceToExcel(records)` | 출석 기록 내보내기 |
| `exportStatsToExcel(stats)` | 통계 내보내기 |

#### exportToExcel 사용 예시

```typescript
import { exportToExcel } from '@/lib/excel'

const data = [
  { name: '홍길동', phone: '010-1234-5678', department: 'CU1부' },
  // ...
]

const columns = [
  { key: 'name', header: '이름' },
  { key: 'phone', header: '연락처' },
  { key: 'department', header: '부서' },
]

exportToExcel(data, columns, '교인명단.xlsx')
```

#### exportMembersToExcel 컬럼

| 컬럼 | 설명 |
|------|------|
| 이름 | 교인 이름 |
| 연락처 | 전화번호 |
| 이메일 | 이메일 주소 |
| 생년월일 | YYYY-MM-DD 형식 |
| 부서 | 소속 부서 (다중 시 쉼표 구분) |
| 주소 | 주소 |
| 직업 | 직업 |

#### 특징

- XLSX 라이브러리 사용
- 자동 열 너비 조정
- 한글 파일명 지원

---

## 8. 미들웨어

**경로**: `src/middleware.ts`

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 기능

- 모든 페이지 요청에서 Supabase 세션 갱신
- 정적 파일 및 이미지 요청 제외
- 쿠키 자동 갱신으로 세션 유지

---

## 9. 타입 정의

**경로**: `src/types/database.ts`

### 주요 타입

```typescript
// 역할
export type UserRole =
  | 'super_admin'
  | 'president'
  | 'accountant'
  | 'team_leader'
  | 'member'

// 부서 코드
export type DepartmentCode =
  | 'ck'
  | 'cu_worship'
  | 'youth'
  | 'cu1'
  | 'cu2'
  | 'leader'

// 보고서 유형
export type ReportType =
  | 'weekly'
  | 'meeting'
  | 'education'

// 결재 상태
export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'coordinator_reviewed'
  | 'manager_approved'
  | 'final_approved'
  | 'rejected'
  | 'revision_requested'

// 출석 유형
export type AttendanceType = 'worship' | 'meeting'
```

### 테이블 타입 별칭

```typescript
export type Department = Database['public']['Tables']['departments']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Cell = Database['public']['Tables']['cells']['Row']
// ...
```

### 조인 타입

```typescript
// 교인 + 부서 정보
export interface MemberWithDepartments extends Member {
  member_departments: Array<{
    department_id: string
    is_primary: boolean
    departments: {
      id: string
      name: string
      code?: string
    }
  }>
}
```

---

## 10. 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | O |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID 공개 키 (웹 푸시) | O |
| `VAPID_PRIVATE_KEY` | VAPID 비공개 키 (웹 푸시, 서버 전용) | O |

### 설정 방법

1. Supabase Dashboard에서 키 확인
2. `.env.local` 파일 생성

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 11. 쿼리 패턴

### 기본 CRUD

```typescript
// SELECT
const { data, error } = await supabase
  .from('members')
  .select('*')
  .eq('is_active', true)

// INSERT
const { data, error } = await supabase
  .from('members')
  .insert({ name: '홍길동', phone: '010-1234-5678' })
  .select()
  .single()

// UPDATE
const { error } = await supabase
  .from('members')
  .update({ name: '김철수' })
  .eq('id', memberId)

// DELETE
const { error } = await supabase
  .from('members')
  .delete()
  .eq('id', memberId)
```

### 조인 쿼리

```typescript
// 교인 + 부서 정보 조회
const { data } = await supabase
  .from('members')
  .select(`
    *,
    member_departments (
      department_id,
      is_primary,
      departments (
        id,
        name,
        code
      )
    )
  `)
  .eq('is_active', true)
```

### 병렬 쿼리

```typescript
// Promise.all로 병렬 처리
const [reportResult, programsResult, historyResult] = await Promise.all([
  supabase.from('weekly_reports').select('*').eq('id', reportId).single(),
  supabase.from('report_programs').select('*').eq('report_id', reportId),
  supabase.from('approval_history').select('*').eq('report_id', reportId),
])
```

### Optimistic Update 패턴

```typescript
// 1. UI 즉시 업데이트
setDeletedIds(prev => new Set([...prev, id]))

// 2. API 호출
const { error } = await supabase
  .from('members')
  .delete()
  .eq('id', id)

// 3. 실패 시 롤백
if (error) {
  setDeletedIds(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })
}
```
